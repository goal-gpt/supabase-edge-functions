# supabase-template

## Get started
0. Make sure you have [Docker](https://www.docker.com/) installed and running

1. Clone this repo

2. Install dependencies, including the Supabase CLI

```bash
yarn
```

**Note**: If you install the Supabase CLI using a different method you have to make sure you are on version 1.49.4 as more recent versions currently suffer from an issue which prevents this from working correctly.

<!-- TODO: Determine if this step should be removed -->
3. Create frontend env file

```bash
cp .env.example .env
```

4. Create supabase functions env file

```bash
echo "OPENAI_API_KEY=sk-xxx" > supabase/.env
```

5. If not already running, start Docker. Learn how to do this for your OS [here](https://docs.docker.com/desktop/).

6. Start the supabase project.

```bash
npx supabase start
```

7. Start the supabase functions locally

```bash
yarn supabase:dev
```

8. Start the frontend locally

```bash
yarn dev
```

9. Open [http://localhost:3100](http://localhost:3100) with your browser to see the result.
