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

## Testing and Linting
Supabase is build on [Deno](https://deno.com/). Deno comes with a test-runner and linter.

To lint:
```shell
$ npm run lint # deno lint
```

To run tests:
```shell
$ npm test # deno test --import-map=./supabase/functions/import_map.json
```

## Invoking Connor from the CLI
To invoke Connor and insert content and embeddings, first update the `./scripts/contentData.ts` file with the content you want to insert. Next, ensure you have `ts-node` globally installed (`npm install -g ts-node`), and then run the following command:

```shell
ts-node ./scripts/upload_content.ts <user_id> <token>
```

## Continuous Deployment

The [functions.yml](/.github/workflows/functions.yml) defines a job, "lint-and-test" that will lint and and run the code's tests when pull requests and pushes to `main` are made.

Additionally, if that job succeeds, the action will deploy this repo's functions to Supabase upon pushes/merges to `main`. To successfully deploy, the GitHub Action uses the following three secrets that are stored encrypted in the GitHub Secrets for this repo: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_ENV_FILE`.

The values for `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` are available/can be setup on Supabase.

`SUPABASE_ENV_FILE` consists of the environment variables needed to run the edge functions that are not the [default secrets](https://supabase.com/docs/guides/functions/secrets#default-secrets). During the GitHub Action, the value of this secret is echoed into a `.env` file which is then passed to Supabase. This step is taken because the secrets set in the Supabase Vault do not appear to be available to edge functions. If the environment variables used by the functions changes, the `SUPABASE_ENV_FILE` secret should be updated at GitHub.

## Local DB setup
To replicate the remote DB locally for the first time, run the following commands:

```bash
supabase link --project-ref <PROJECT_ID>
supabase migration new <MIGRATION_NAME>
supabase db dump --db-url postgres://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres > ./supabase/migrations/$(ls -t supabase/migrations | head -n1 )
supabase db reset
```

To verify you are using the latest migration, run the following command:

```bash
supabase db diff
```

## Updating the DB schema
When the DB is connected, it is now possible to make changes via the Supabase dashboard and create migrations in `supabase/migrations/*`. Follow these steps:
- Make a change to the Supabase DB via the dashboard
- Run `supabase db diff -f <new-migration-filename> --linked`
- Run `supabase db reset` to apply the migrations locally
