/* eslint @typescript-eslint/no-var-requires: "off" */

require("dotenv").config({ path: ".env" });
const { exec } = require("child_process");
const { parse } = require("url");

const supabaseUrl = process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error("Environment variable SUPABASE_URL is not defined");
  process.exit(1);
}

const parsedUrl = parse(supabaseUrl);
const projectId = parsedUrl.hostname?.split(".")[0];

const command =
  `npx supabase gen types typescript --project-id ${projectId} --schema public > supabase/types/supabase.ts`;

exec(command, (error: any, stdout: any, stderr: any) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
