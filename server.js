// Servidor local para desenvolvimento e testes (npm start). Na Vercel, quem atende é api/index.js.
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
if(existsSync('.env')&&typeof process.loadEnvFile==='function')process.loadEnvFile('.env');
const {handle}=await import('./lib/handler.js');
const port=Number(process.env.PORT)||3000,host=process.env.HOST||'127.0.0.1';
createServer(handle).listen(port,host,()=>console.log(`Conexão Talentos em http://${host}:${port} (armazenamento: ${process.env.DATA_BACKEND||'local'})`));
