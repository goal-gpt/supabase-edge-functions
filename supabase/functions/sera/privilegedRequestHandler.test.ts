import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
  initialPrompt,
  introduction,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "./llm.ts";
import { SeraRequest } from "./sera.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import * as sinon from "sinon";
import { assertEquals, assertStrictEquals } from "testing/asserts.ts";
import {
  AIChatMessage,
  BaseChatMessage,
  SystemChatMessage,
} from "langchain/schema";

// TODO: Determine how to make tests DRY-er
Deno.test("handleRequest", async (t) => {
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  const chat = 1;
  const modelResponse = "It's a wonderful day to get flit";
  const modelStubWithCall = sinon.createStubInstance(ChatOpenAI, {
    call: new AIChatMessage(modelResponse),
  });

  await t.step("without a chat", async (t) => {
    await t.step("creates chat and adds messages to the chat", async (t) => {
      const chatPromise = new Promise<number>((resolve) => {
        resolve(chat);
      });

      await t.step(
        "with an empty message, returns the introduction",
        async () => {
          const modelStub = sinon.createStubInstance(ChatOpenAI);
          const createChatStub = stub(
            _privilegedRequestHandlerInternals,
            "createChat",
            returnsNext([chatPromise, chatPromise])
          );
          const createChatLineStub = stub(
            _privilegedRequestHandlerInternals,
            "createChatLine"
          );

          const seraRequest: SeraRequest = {
            message: "",
          };

          const response =
            await _privilegedRequestHandlerInternals.handleRequest(
              modelStub,
              seraRequest.message,
              supabaseClientStub,
              seraRequest.chat
            );

          assertSpyCalls(createChatStub, 1);
          assertSpyCalls(createChatLineStub, 2);
          assertStrictEquals(response.text, introduction);
          assertEquals(response.chat, chat);

          createChatStub.restore();
          createChatLineStub.restore();
        }
      );

      await t.step(
        "with a non-empty message, returns message from model",
        async () => {
          const seraRequest: SeraRequest = {
            message: "Hello",
          };
          const chat = 1;
          const chatPromise = new Promise<number>((resolve) => {
            resolve(chat);
          });
          const createChatStub = stub(
            _privilegedRequestHandlerInternals,
            "createChat",
            returnsNext([chatPromise])
          );
          const createChatLineStub = stub(
            _privilegedRequestHandlerInternals,
            "createChatLine"
          );

          const response =
            await _privilegedRequestHandlerInternals.handleRequest(
              modelStubWithCall,
              seraRequest.message,
              supabaseClientStub,
              seraRequest.chat
            );

          assertSpyCalls(createChatStub, 1);
          assertSpyCalls(createChatLineStub, 3);
          assertStrictEquals(response.text, modelResponse);
          assertEquals(response.chat, chat);

          createChatStub.restore();
          createChatLineStub.restore();
        }
      );
    });
  });
  await t.step("with a chat, gets chat lines", async () => {
    const createChatLineStub = stub(
      _privilegedRequestHandlerInternals,
      "createChatLine"
    );

    const chatLines: BaseChatMessage[] = [new SystemChatMessage(initialPrompt)];
    const chatLinesPromise: Promise<BaseChatMessage[]> = new Promise(
      (resolve) => {
        resolve(chatLines);
      }
    );
    const getAllChatLinesStub = stub(
      _privilegedRequestHandlerInternals,
      "getAllChatLines",
      returnsNext([chatLinesPromise])
    );

    const seraRequest: SeraRequest = {
      message: "Hello",
      chat: chat,
    };

    await _privilegedRequestHandlerInternals.handleRequest(
      modelStubWithCall,
      seraRequest.message,
      supabaseClientStub,
      seraRequest.chat
    );

    assertSpyCalls(getAllChatLinesStub, 1);
  });
});
