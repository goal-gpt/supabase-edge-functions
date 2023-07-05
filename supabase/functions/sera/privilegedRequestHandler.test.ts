import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
  premise,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals, ModelsContext } from "../_shared/llm.ts";
import { SeraRequest } from "./sera.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as sinon from "sinon";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertStringIncludes,
} from "testing/asserts.ts";
import { BaseChatMessage, SystemChatMessage } from "langchain/schema";

// TODO: Determine how to make tests DRY-er
Deno.test("handleRequest", async (t) => {
  const chat = 1;
  const chatLine = 1;
  const rawContent = "Test content";
  const title = "Test Title";
  const link = "https://example.com";
  const rpcStub = sinon.stub().resolves({
    data: [{
      id: 1,
      raw_content: rawContent,
      title: title,
      link: link,
    }],
  });
  const embedding = "embedding";
  const modelResponseString =
    `{\n  "summary": "To plan a wedding, you need to set a budget, create a guest list, choose a venue, select vendors, and plan the details.",\n  "goal": "Plan a wedding",\n  "steps": [\n    {\n      "number": 1,\n      "action": {\n        "name": "Set a budget",\n        "description": "Determine how much you can afford to spend on your wedding.",\n        "ideas": {\n          "mostObvious": "Calculate your total budget by considering your savings, contributions from family, and any loans you may need.",\n          "leastObvious": "Consider using a wedding budget calculator to help you allocate funds to different aspects of your wedding.",\n          "inventiveOrImaginative": "Explore creative ways to save money on your wedding, such as DIY decorations or opting for a non-traditional venue.",\n          "rewardingOrSustainable": "By setting a budget, you can ensure that you don\'t overspend and start your married life on a solid financial foundation."\n        }\n      }\n    },\n    {\n      "number": 2,\n      "action": {\n        "name": "Create a guest list",\n        "description": "Decide who you want to invite to your wedding.",\n        "ideas": {\n          "mostObvious": "Start by listing close family members and friends, and then consider extended family, colleagues, and acquaintances.",\n          "leastObvious": "Consider the size of your venue and your budget when finalizing your guest list.",\n          "inventiveOrImaginative": "If you have a large guest list but a limited budget, consider having a smaller, intimate ceremony and a larger reception.",\n          "rewardingOrSustainable": "Creating a guest list helps you estimate the number of guests and plan other aspects of your wedding, such as catering and seating arrangements."\n        }\n      }\n    } ]\n}`;
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient, {
    rpc: rpcStub,
  });
  const AIFunctionsStub = {
    additional_kwargs: {
      function_call: {
        name: "test_function",
        arguments: modelResponseString,
      },
    },
  };
  const chatModelStubWithCall = sinon.createStubInstance(ChatOpenAI, {
    predictMessages: new Promise((resolve) => {
      resolve(AIFunctionsStub);
    }),
  });
  const embedModelStubWithCall = sinon.createStubInstance(
    OpenAIEmbeddings,
    {
      embedQuery: new Promise((resolve) => {
        resolve(embedding);
      }),
    },
  );
  const splitterStub = sinon.createStubInstance(
    RecursiveCharacterTextSplitter,
  );
  const modelsContextStub: ModelsContext = {
    chat: chatModelStubWithCall,
    embed: embedModelStubWithCall,
    splitter: splitterStub,
  };

  await t.step("without a chat", async (t) => {
    await t.step("creates chat", async () => {
      const seraRequest: SeraRequest = {
        message: "Hello",
      };
      const chat = 1;
      const chatPromise = new Promise<number>((resolve) => {
        resolve(chat);
      });
      const chatLinePromise = new Promise<number>((resolve) => {
        resolve(chatLine);
      });
      const createChatStub = stub(
        _privilegedRequestHandlerInternals,
        "createChat",
        returnsNext([chatPromise]),
      );
      const createChatLineStub = stub(
        _privilegedRequestHandlerInternals,
        "createChatLine",
        returnsNext([chatLinePromise, chatLinePromise]),
      );
      stub(
        _privilegedRequestHandlerInternals,
        "updateChatLineMessage",
      );

      const seraResponse = await _privilegedRequestHandlerInternals
        .handleRequest(
          modelsContextStub,
          supabaseClientStub,
          seraRequest,
        );

      assertSpyCalls(createChatStub, 1);
      assertSpyCalls(createChatLineStub, 2);
      assertEquals(seraResponse.chat, chat);
      assertStringIncludes(seraResponse.text, "To plan a wedding");
      assertEquals(seraResponse.plan!.goal, "Plan a wedding");
      assertEquals(seraResponse.plan!.steps.length, 2);
      assertEquals(seraResponse.plan!.steps[0].number, 1);
      assertEquals(
        seraResponse.plan!.steps[0].action.name,
        "Set a budget",
      );
      assertEquals(
        seraResponse.plan!.steps[0].action.description,
        "Determine how much you can afford to spend on your wedding.",
      );
      assertEquals(
        Object.keys(seraResponse.plan!.steps[0].action.ideas || {}).length,
        4,
      );
      sinon.assert.calledOnce(supabaseClientStub.rpc);
      sinon.assert.calledWith(
        supabaseClientStub.rpc,
        "match_documents",
        {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.78,
          match_count: 10,
        },
      );
      createChatStub.restore();
      createChatLineStub.restore();
    });
  });
  await t.step("with a chat, gets chat lines", async () => {
    stub(_privilegedRequestHandlerInternals, "createChatLine");

    const chatLines: BaseChatMessage[] = [new SystemChatMessage(premise)];
    const chatLinesPromise: Promise<BaseChatMessage[]> = new Promise(
      (resolve) => {
        resolve(chatLines);
      },
    );
    const getAllChatLinesStub = stub(
      _privilegedRequestHandlerInternals,
      "getAllChatLines",
      returnsNext([chatLinesPromise]),
    );

    const seraRequest: SeraRequest = {
      message: "Hello",
      chat: chat,
    };

    await _privilegedRequestHandlerInternals.handleRequest(
      modelsContextStub,
      supabaseClientStub,
      seraRequest,
    );

    assertSpyCalls(getAllChatLinesStub, 1);
  });

  await t.step("handles responses without plan JSON", async () => {
    const text = "Hello! How can I assist you today?";
    const modelResponseStringWithoutPlan = `{\n  "summary": "${text}" }`;
    const AIFunctionsStubWithoutPlan = {
      additional_kwargs: {
        function_call: {
          name: "test_function",
          arguments: modelResponseStringWithoutPlan,
        },
      },
    };
    const seraRequest: SeraRequest = {
      message: "Hello",
    };
    const chatPromise = new Promise<number>((resolve) => {
      resolve(chat);
    });
    const createChatStub = stub(
      _privilegedRequestHandlerInternals,
      "createChat",
      returnsNext([chatPromise]),
    );
    const modelStubWithCallForResponseWithoutPlan = sinon.createStubInstance(
      ChatOpenAI,
      {
        predictMessages: new Promise((resolve) => {
          resolve(AIFunctionsStubWithoutPlan);
        }),
      },
    );
    const splitterStub = sinon.createStubInstance(
      RecursiveCharacterTextSplitter,
    );
    const modelsContextStub: ModelsContext = {
      chat: modelStubWithCallForResponseWithoutPlan,
      embed: embedModelStubWithCall,
      splitter: splitterStub,
    };

    const seraResponse = await _privilegedRequestHandlerInternals.handleRequest(
      modelsContextStub,
      supabaseClientStub,
      seraRequest,
    );

    const expectedResponse = {
      text: text,
      chat: chat,
    };
    assertStrictEquals(seraResponse.text, expectedResponse.text);
    assert(!Object.keys(seraResponse).includes("plan"));
    assertEquals(seraResponse.chat, chat);

    createChatStub.restore();
  });
});
