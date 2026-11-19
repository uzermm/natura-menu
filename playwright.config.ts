import {defineConfig} from '@playwright/test';
const port=process.env.E2E_PORT||'3124';
export default defineConfig({testDir:'./tests/e2e',workers:1,fullyParallel:false,timeout:45000,use:{baseURL:'http://127.0.0.1:'+port,browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL,trace:'retain-on-failure'},webServer:{command:'node scripts/start-e2e.mjs',url:'http://127.0.0.1:'+port+'/api/health',reuseExistingServer:false,timeout:60000},reporter:process.env.CI?'github':'list'});
