import { corsHeaders } from "../_shared/cors.ts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  HumanChatMessage,
  AIChatMessage,
  SystemChatMessage,
  BaseChatMessage,
} from "langchain/schema";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase.ts";

async function getAllChatLines(
  supabaseClient: SupabaseClient<Database>,
  chat: number
) {
  console.log("Getting all chat lines", chat);
  const { data, error } = await supabaseClient
    .from("chat_line")
    .select("*")
    .eq("chat", chat);
  if (error) throw error;

  const messages: BaseChatMessage[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i].message) {
      switch (data[i].sender) {
        case "ai":
          messages.push(new AIChatMessage(data[i].message!));
          break;
        case "human":
          messages.push(new HumanChatMessage(data[i].message!));
          break;
        case "system":
          messages.push(new SystemChatMessage(data[i].message!));
          break;
        default:
          throw new Error("Invalid chat line sender");
      }
    }
  }

  return messages;
}

async function createChatLine(
  supabaseClient: SupabaseClient<Database>,
  message: BaseChatMessage,
  chat?: number
) {
  console.log("Creating chat line", message.text, chat);

  const { data: chatLine, error } = await supabaseClient
    .from("chat_line")
    .insert({ chat: chat, message: message.text, sender: message._getType() })
    .select();
  if (error) throw error;
  console.log("Created chat line", chatLine);
}

async function createChat(
  supabaseClient: SupabaseClient<Database>
): Promise<number> {
  console.log("Creating chat");
  const { data, error } = await supabaseClient.from("chat").insert({}).select();
  if (error) throw error;

  const chat = data[0].id
  console.log("Created chat", chat);
  return chat;
}

export async function answerQuery(
  model: ChatOpenAI,
  message: string,
  supabaseClient: SupabaseClient<Database>,
  chat?: number
): Promise<Response> {
  const messages: BaseChatMessage[] = [];
  try {
    if (chat) {
      messages.push(...(await getAllChatLines(supabaseClient, chat)));
    } else {
      chat = await createChat(supabaseClient);
    }

    if (messages.length === 0) {
      const systemChatMessage = new SystemChatMessage(
        `You are Sera, a helpful, empathetic, emotionally-aware, and imaginative AI chatbot. ` +
          // `You know that people have different financial situations and different financial goals. ` +
          `You know that money affects every aspect of people's lives. ` +
          // `You know that people have different levels of financial knowledge and you want to help them improve their financial knowledge. ` +
          // `You know that many people have poor habits with money and you want to help them improve their financial habits. ` +
          // `You know that many people feel shame and guilt with respect to money matters and you want to help them to feel better. ` +
          `Your task is to help users make plans to manage the financial aspects of events in their lives and to achieve their financial goals. ` +
          `You are very creative and open-minded when it comes to finding financial aspects to a user's concerns. ` +
          `If you cannot find any financial aspects to help the user with at all,` +
          `politely respond that you only help with inquiries about personal finance.` +
          `For example, you are happy to help with the financial aspects of a wedding, but you cannot help to choose the color of the flowers.` +
          `If you do not know the answer, explain that you do not know the answer. Do not try to make up an answer.` +
          `First, ask the user follow-up questions to make sure you understand the user's worries, ` +
          `the financial, social, and emotional context of the user's situation, and any other relevant information. ` +
          `If knowing personal information about the user would help to formulate a plan with the user ` +
          `you should ask for the personal information that would be helpful. ` +
          `If the user does not want to provide personal information, you respect the user's privacy ` +
          `and try to respond as best you can without the requested personal information. ` +
          `Continue to ask follow-up questions until you have enough information to formulate a plan. ` +
          `You are thankful that the user is willing to share information with you. ` +
          `Never say that you are providing "advice". ` +
          `Once the user agrees to a goal, break down the goal into small steps that are Specific, Measurable, Achievable, Relevant, and Time-Bound. ` +
          `The format should be:\n\n` +
          `Step 1 - ...\n` +
          `Step 2 - …\n` +
          `…\n` +
          `Step N - …\n\n` +
          `Ask the user whether they think the steps are right for them and, if so, can the user do the steps. ` +
          `If the user responds negatively, let the user know it is OK to ask for a simpler plan and ` +
          `politely ask the user about the user's concerns and try to address the concerns. ` +
          `Continue to clarify with the user whether the steps are right for them and whether the user can do them until the user affirms that all the steps work for them. `
        // `If the user likes the plan, tell a joke`

        // `Next, if you have enough information to formulate a plan, make only one suggestion to the user, not multiple suggestions. You do not want to overwhelm or confuse the user.`

        // `If it takes multiple steps to achieve a goal, find out from the user which ones the user has already taken.`+
        // `When you know which steps the user has already taken, suggest a plan that is that is Specific, Measurable, Achievable, Relevant, and Time-Bound for the next step to be completed.`

        // `If you do not know the user's name, you should ask for the user's name.`+
        // `You respond to messages with alacrity and effulgence.`+
        // `You use what you know and the information you have available to help users resolve`+
        // // `You respond to inquiries about personal finance, financial planning, budgeting, saving, investing,`+
        // // `financial literacy, financial empowerment, financial well-being, habits, goals, wellness.`+
        // `Your responses are conversational and include lots of specific details from the context you have.`+
        // // `If the message has a financial implication, respond with alacrity and effulgence.`+
        // `If you cannot find any financial aspects to help the user with at all,`+
        // `politely respond that you only help with inquiries about personal finance.`+
        // `For example, you are happy to help plan the financial implications of a wedding, but you cannot help to choose the color of the flowers.`+
        // `Do not list the specific topics that you respond to.`+
        // `If you do not know the answer, explain that you do not know the answer. Do not try to make up an answer.`+
        // `Once you have enough information to formulate a plan, ask the user if they would like to work with you to come up with a plan.`+
        // `If the user responds positively, you should formulate a plan, present it to the user, and ask how they feel about the proposal.`+
        // `Specifically, you want to know whether the user thinks the plan is right for them and, if so, can the user do it.`+
        // `If the user responds negatively, politely inquire about the user's concerns and try to address them.`+
        // `Continue to clarify with the user whether the plan is right for them and whether the user can do it until the user affirms that the plan works for them.`+
        // `You are thankful that the user is willing to share information with you.`+
        // `Never say that you are providing "advice".`
      );

      await createChatLine(supabaseClient, systemChatMessage, chat);
      messages.push(systemChatMessage);
    }
    const humanChatMessage = new HumanChatMessage(message);

    await createChatLine(supabaseClient, humanChatMessage, chat);
    messages.push(humanChatMessage);

    console.log("Calling OpenAI", messages);
    let response = await model.call(messages);
    console.log("Got response from OpenAI", response.text);

    if (
      !messages.some((message) => message.text.includes("Plan created")) &&
      messages.filter((message) => message._getType() === "human").length > 1
    ) {
      console.log("Calling OpenAI to confirm consent to the plan", messages);
      const formalizePlanSystemMessage = new SystemChatMessage(
        `If you have suggested a plan to the user and the user response delimited by \`\`\` is totally positive, reformat the steps with the following format:\n\n` +
          `Title: <summary description of the plan's goal>\n` +
          `JSON: <a JSON array consisting of step objects, where each object has 2 keys: 'number', which is the number of the step, and 'action', which is the complete description of the step as provided earlier\n\n` +
          `Do not include the word "plan" in the title.\n\n` +
          `The action key is the complete content of the step that you provided earlier. ` +
          `Ask the user whether they think the steps are right for them and, if so, can the user do the steps. ` +
          `If the user responds negatively, let the user know it is OK to ask for a simpler plan and ` +
          `politely ask the user about the user's concerns and try to address the concerns. ` +
          `After the user agrees to the plan, inform the user that their plan has been saved. ` +
          `Because you are an empathetic AI and you know that thinking about money can be stressful, ` +
          `say something to lighten the mood.\n\n` +
          `User Response:\`\`\`${message}\`\`\`\n\n}`
      );

      messages.push(formalizePlanSystemMessage);

      response = await model.call(messages);
      console.log("Got response from OpenAI", response.text);

      // if (response.text.includes("Plan created!")) {
      //   console.log("Calling OpenAI to formalize the plan", messages);
      //   messages.push(
      //     new SystemChatMessage(
      //       `Reformat the steps with the following format:\n` +
      //         `Title: <summary description of the plan's goal>\n` +
      //         `JSON: <a JSON array consisting of step objects, where each object has 2 keys: 'number', which is the number of the step, and 'action', which is the complete description of the step as provided earlier\n\n` +
      //         `The title should not include the word 'plan'.\n` +
      //         `The action key should not be a summary of the step, but the complete content of the step that you provided earlier.`
      //     )
      //   );

      //   response = await model.call(messages);
      //   console.log("Got response from OpenAI", response.text);
      // }
      // if (response.text.includes("Plan created!")) {
      //   console.log("Calling OpenAI to wrap up the chat", messages);
      //   messages.push(
      //     new SystemChatMessage(
      //       `Inform the user that their plan has been saved. ` +
      //         `Because you are an empathetic AI and you know that thinking about money can be stressful, ` +
      //         `say something to lighten the mood.`
      //     )
      //   );

      //   response = await model.call(messages);
      //   console.log("Got response from OpenAI", response.text);
      // }
    }

    const aiChatMessage = new AIChatMessage(response.text);

    await createChatLine(supabaseClient, aiChatMessage, chat);

    const body = {
      text: response.text,
      chat: chat,
    };
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
