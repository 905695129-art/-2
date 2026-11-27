const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const id = () => crypto.randomUUID();
const hash = async (value) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
};
const readJson = async req => { try { return await req.json(); } catch { return null; } };
const cors = (response, origin) => {
  const h = new Headers(response.headers);
  h.set("access-control-allow-origin", origin || "null");
  h.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  h.set("access-control-allow-headers", "content-type,authorization");
  h.set("vary", "Origin");
  return new Response(response.body, { status: response.status, headers: h });
};
async function creatorFor(req, env) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return env.DB.prepare("SELECT c.id,c.email FROM creator_sessions s JOIN creators c ON c.id=s.creator_id WHERE s.token_hash=? AND s.expires_at>datetime('now')")
    .bind(await hash(token)).first();
}
export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "*";
    if (req.method === "OPTIONS") return cors(new Response(null, {status:204}), origin);
    const url = new URL(req.url), path = url.pathname;
    try {
      if (path === "/health" && req.method === "GET") return cors(json({ok:true,service:"heart-tool-api",payment:"not-configured"}), origin);

      if (path === "/api/register" && req.method === "POST") {
        const body = await readJson(req);
        if (!body || typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email) || typeof body.password !== "string" || body.password.length < 12)
          return cors(json({error:"请输入有效邮箱，密码至少12位"},400), origin);
        // Password hashing is delegated to PBKDF2; never store plaintext passwords.
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.importKey("raw",new TextEncoder().encode(body.password),"PBKDF2",false,["deriveBits"]);
        const bits = await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},key,256);
        const passwordHash = "pbkdf2$310000$"+btoa(String.fromCharCode(...salt))+"$"+btoa(String.fromCharCode(...new Uint8Array(bits)));
        const creatorId=id(), token=id()+id();
        try { await env.DB.prepare("INSERT INTO creators(id,email,password_hash) VALUES(?,?,?)").bind(creatorId,body.email.toLowerCase(),passwordHash).run(); }
        catch { return cors(json({error:"该邮箱可能已注册"},409),origin); }
        await env.DB.prepare("INSERT INTO creator_sessions(token_hash,creator_id,expires_at) VALUES(?,?,datetime('now','+14 days'))").bind(await hash(token),creatorId).run();
        return cors(json({creator:{id:creatorId,email:body.email.toLowerCase()},token},201),origin);
      }

      if (path === "/api/login" && req.method === "POST") {
        const body=await readJson(req);
        if(!body?.email||!body?.password) return cors(json({error:"邮箱和密码必填"},400),origin);
        const creator=await env.DB.prepare("SELECT * FROM creators WHERE email=?").bind(String(body.email).toLowerCase()).first();
        if(!creator) return cors(json({error:"邮箱或密码错误"},401),origin);
        const parts=creator.password_hash.split("$");
        const salt=Uint8Array.from(atob(parts[2]),c=>c.charCodeAt(0));
        const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(body.password),"PBKDF2",false,["deriveBits"]);
        const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:Number(parts[1]),hash:"SHA-256"},key,256);
        const actual=btoa(String.fromCharCode(...new Uint8Array(bits)));
        if(actual!==parts[3]) return cors(json({error:"邮箱或密码错误"},401),origin);
        const token=id()+id();
        await env.DB.prepare("INSERT INTO creator_sessions(token_hash,creator_id,expires_at) VALUES(?,?,datetime('now','+14 days'))").bind(await hash(token),creator.id).run();
        return cors(json({creator:{id:creator.id,email:creator.email},token}),origin);
      }

      const creator=await creatorFor(req,env);
      if(path.startsWith("/api/creator/") && !creator) return cors(json({error:"请先登录"},401),origin);

      if(path==="/api/creator/experiences" && req.method==="GET") {
        const rows=await env.DB.prepare("SELECT id,title,intro,recipient,status,updated_at FROM experiences WHERE creator_id=? ORDER BY updated_at DESC").bind(creator.id).all();
        return cors(json({items:rows.results}),origin);
      }
      if(path==="/api/creator/experiences" && req.method==="POST") {
        const b=await readJson(req); if(!b||typeof b.title!=="string"||!b.title.trim()) return cors(json({error:"作品标题必填"},400),origin);
        const eid=id();
        await env.DB.prepare("INSERT INTO experiences(id,creator_id,title,intro,recipient) VALUES(?,?,?,?,?)").bind(eid,creator.id,b.title.slice(0,100),String(b.intro||"").slice(0,2000),String(b.recipient||"").slice(0,100)).run();
        return cors(json({id:eid},201),origin);
      }
      const expMatch=path.match(/^\/api\/creator\/experiences\/([\w-]+)$/);
      if(expMatch && req.method==="GET") {
        const exp=await env.DB.prepare("SELECT * FROM experiences WHERE id=? AND creator_id=?").bind(expMatch[1],creator.id).first();
        if(!exp) return cors(json({error:"作品不存在"},404),origin);
        const levels=await env.DB.prepare("SELECT id,position,title,price_cents,hint,content_type,content_json FROM levels WHERE experience_id=? ORDER BY position").bind(exp.id).all();
        return cors(json({experience:exp,levels:levels.results}),origin);
      }
      if(expMatch && req.method==="PUT") {
        const b=await readJson(req); const exp=await env.DB.prepare("SELECT id FROM experiences WHERE id=? AND creator_id=?").bind(expMatch[1],creator.id).first();
        if(!exp) return cors(json({error:"作品不存在"},404),origin);
        await env.DB.prepare("UPDATE experiences SET title=?,intro=?,recipient=?,status=?,updated_at=datetime('now') WHERE id=? AND creator_id=?").bind(String(b?.title||"").slice(0,100),String(b?.intro||"").slice(0,2000),String(b?.recipient||"").slice(0,100),b?.status==="published"?"published":"draft",exp.id,creator.id).run();
        await env.DB.prepare("DELETE FROM levels WHERE experience_id=?").bind(exp.id).run();
        for(const [i,l] of (Array.isArray(b?.levels)?b.levels:[]).entries()){
          if(i>=60) break;
          await env.DB.prepare("INSERT INTO levels(id,experience_id,position,title,price_cents,hint,content_type,content_json) VALUES(?,?,?,?,?,?,?,?)").bind(id(),exp.id,i,String(l.title||"未命名关卡").slice(0,100),Math.max(0,Math.round(Number(l.price||0)*100)),String(l.hint||"").slice(0,500),String(l.type||"text"),JSON.stringify(l.content||{})).run();
        }
        return cors(json({ok:true}),origin);
      }
      const publicMatch=path.match(/^\/p\/([\w-]+)$/);
      if(publicMatch && req.method==="GET") {
        const exp=await env.DB.prepare("SELECT id,title,intro,recipient FROM experiences WHERE id=? AND status='published'").bind(publicMatch[1]).first();
        if(!exp) return cors(json({error:"页面不存在或未发布"},404),origin);
        const rows=await env.DB.prepare("SELECT id,position,title,price_cents,hint,content_type FROM levels WHERE experience_id=? ORDER BY position").bind(exp.id).all();
        return cors(json({experience:exp,levels:rows.results}),origin);
      }
      if(path==="/api/checkout" && req.method==="POST") {
        // Deliberately disabled until a creator's approved merchant/sub-merchant credentials
        // and signed provider webhook adapter are configured. Never fake payment success.
        return cors(json({error:"真实支付尚未配置。需先完成创作者收款主体审核及支付机构签约。"},503),origin);
      }
      if(path.startsWith("/api/webhooks/")) return cors(json({error:"支付回调尚未配置；禁止手动标记订单已支付"},503),origin);
      return cors(json({error:"Not found"},404),origin);
    } catch (e) {
      return cors(json({error:"服务器内部错误"},500),origin);
    }
  }
};
