# supabase-edge-functions

## Get started
0. Make sure you have [Docker](https://www.docker.com/) installed and running

1. Clone this repo

2. Install dependencies, including the Supabase CLI

```bash
yarn
```

**Note**: If you install the Supabase CLI using a different method you have to make sure you are on version 1.49.4 as more recent versions currently suffer from an issue which prevents this from working correctly.

3. Create supabase functions env file

```bash
echo "OPENAI_API_KEY=sk-xxx" > supabase/.env
```

4. If not already running, start Docker. Learn how to do this for your OS [here](https://docs.docker.com/desktop/).

5. Start the supabase project.

```bash
npx supabase start
```

6. Start the supabase functions locally

```bash
yarn supabase:dev
```

## Continuous Deployment
A GitHub Action deploys this repo's functions to Supabase when committed to `main`. To successfully deploy, the GitHub Action uses the following three secrets that are stored encrypted in the GitHub Secrets for this repo: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_ENV_FILE`.

The values for `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` are available/can be setup on Supabase.

`SUPABASE_ENV_FILE` consists of the environment variables needed to run the edge functions that are not the [default secrets](https://supabase.com/docs/guides/functions/secrets#default-secrets). During the GitHub Action, the value of this secret is echoed into a `.env` file which is then passed to Supabase. This step is taken because the secrets set in the Supabase Vault do not appear to be available to edge functions. If the environment variables used by the functions changes, the `SUPABASE_ENV_FILE` secret should be updated at GitHub.
