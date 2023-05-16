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