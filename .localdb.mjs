import EmbeddedPostgres from "embedded-postgres";
const pg = new EmbeddedPostgres({ databaseDir: "/tmp/pg/data", user: "postgres", password: "postgres", port: 5433, persistent: true });
try { await pg.initialise(); } catch (e) { console.log("init skip", e.message); }
await pg.start();
try { await pg.createDatabase("fornexo"); } catch (e) { console.log("db exists"); }
console.log("PG READY");
setInterval(() => {}, 1 << 30);
