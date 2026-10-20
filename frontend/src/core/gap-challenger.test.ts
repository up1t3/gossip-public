// E:\Boltalka\frontend\src\core\gap-challenger.test.ts
import assert from "node:assert";

// Настройка мок-окружения
const storage: Record<string, string> = {};
globalThis.window = {} as any;
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { for (const k in storage) delete storage[k]; },
  length: 0,
  key: () => null,
} as any;

globalThis.WebSocket = class {
  constructor() {
    setTimeout(() => {
      if (this.onerror) this.onerror({} as any);
      if (this.onclose) this.onclose({} as any);
    }, 0);
  }
  binaryType = "";
  send() {}
  close() {}
  onerror: any = null;
  onclose: any = null;
  onmessage: any = null;
  onopen: any = null;
} as any;

import { syncManager } from "./sync-manager";
import { tdlib } from "./tdlib/tdlib-adapter";

function resetTestState() {
  localStorage.clear();
  (syncManager as any).localPtsMap = {};
  (syncManager as any).localQts = 0;
  (syncManager as any).localSeq = 0;
  (syncManager as any).syncingChats.clear();
  (syncManager as any).updateListeners.clear();
  (syncManager as any).initUpdateSubscriptions();
  (tdlib as any).localChats = [];
  (tdlib as any).localPtsMap = {};
  (tdlib as any).isOfflineMode = true;
}

async function runChallengerTests() {
  console.log("=== ЗАПУСК ДОПОЛНИТЕЛЬНЫХ ЭМПИРИЧЕСКИХ ТЕСТОВ (CHALLENGER ИТЕРАЦИЯ 2) ===\n");

  // -------------------------------------------------------------
  // ТЕСТ 1: Обнаружение пропуска 1 события (localPts = 10, incoming pts = 12)
  // -------------------------------------------------------------
  console.log("Тест 1: Обнаружение пропуска 1 события...");
  {
    resetTestState();
    const chatId = "chat_gap_1";
    syncManager.setPts(chatId, 10);

    let getDifferenceCalled = false;
    tdlib.send = async (method: string, params: any) => {
      if (method === "get_updates" || method === "updates.getDifference") {
        getDifferenceCalled = true;
        assert.strictEqual(params.chatId, chatId);
        assert.strictEqual(params.lastKnownPts ?? params.pts, 10);
        return {
          updates: [
            { type: "new_message", chatId, message: { id: "msg-11", pts: 11, text: "Сообщение 11", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-12", pts: 12, text: "Сообщение 12", sender: "other" } }
          ],
          pts: 12,
          gapTooLarge: false
        };
      }
      throw new Error(`Неподдерживаемый метод: ${method}`);
    };

    const receivedMessages: any[] = [];
    syncManager.on("message", (data) => {
      receivedMessages.push(data);
    });

    const incomingUpdate = {
      type: "new_message",
      chatId,
      pts: 12,
      message: { id: "msg-12", pts: 12, text: "Сообщение 12", sender: "other", chatId }
    };

    await (syncManager as any).handleIncomingUpdate(incomingUpdate);

    assert.strictEqual(getDifferenceCalled, true, "Должен быть запрошен updates.getDifference");
    assert.strictEqual(syncManager.getPts(chatId), 12, "Pts должен обновиться до 12");
    assert.strictEqual(receivedMessages.length, 2, "Должно прийти ровно 2 сообщения");
    assert.strictEqual(receivedMessages[0].message.id, "msg-11");
    assert.strictEqual(receivedMessages[1].message.id, "msg-12");
    console.log("-> Тест 1 (пропуск 1 события): УСПЕШНО\n");
  }

  // -------------------------------------------------------------
  // ТЕСТ 2: Обнаружение пропуска нескольких событий (localPts = 100, incoming pts = 105)
  // -------------------------------------------------------------
  console.log("Тест 2: Обнаружение пропуска нескольких событий...");
  {
    resetTestState();
    const chatId = "chat_gap_multi";
    syncManager.setPts(chatId, 100);

    let getDifferenceCalled = false;
    tdlib.send = async (method: string, params: any) => {
      if (method === "get_updates" || method === "updates.getDifference") {
        getDifferenceCalled = true;
        assert.strictEqual(params.chatId, chatId);
        assert.strictEqual(params.lastKnownPts ?? params.pts, 100);
        return {
          updates: [
            { type: "new_message", chatId, message: { id: "msg-101", pts: 101, text: "М101", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-102", pts: 102, text: "М102", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-103", pts: 103, text: "М103", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-104", pts: 104, text: "М104", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-105", pts: 105, text: "М105", sender: "other" } }
          ],
          pts: 105,
          gapTooLarge: false
        };
      }
      throw new Error(`Неподдерживаемый метод: ${method}`);
    };

    const receivedMessages: any[] = [];
    syncManager.on("message", (data) => {
      receivedMessages.push(data);
    });

    const incomingUpdate = {
      type: "new_message",
      chatId,
      pts: 105,
      message: { id: "msg-105", pts: 105, text: "М105", sender: "other", chatId }
    };

    await (syncManager as any).handleIncomingUpdate(incomingUpdate);

    assert.strictEqual(getDifferenceCalled, true, "Должен быть запрошен updates.getDifference");
    assert.strictEqual(syncManager.getPts(chatId), 105, "Pts должен обновиться до 105");
    assert.strictEqual(receivedMessages.length, 5, "Должно прийти ровно 5 сообщений");
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(receivedMessages[i].message.pts, 101 + i);
    }
    console.log("-> Тест 2 (пропуск нескольких событий): УСПЕШНО\n");
  }

  // -------------------------------------------------------------
  // ТЕСТ 3: Приход событий не по порядку
  // -------------------------------------------------------------
  console.log("Тест 3: Приход событий не по порядку (конкурентная обработка)...");
  {
    resetTestState();
    const chatId = "chat_out_of_order";
    syncManager.setPts(chatId, 50);

    const receivedMessages: any[] = [];
    syncManager.on("message", (data) => {
      receivedMessages.push(data);
    });

    tdlib.send = async (method: string, _params: any) => {
      if (method === "get_updates" || method === "updates.getDifference") {
        await new Promise((r) => setTimeout(r, 80));
        return {
          updates: [
            { type: "new_message", chatId, message: { id: "msg-51", pts: 51, text: "М51", sender: "other" } },
            { type: "new_message", chatId, message: { id: "msg-52", pts: 52, text: "М52", sender: "other" } }
          ],
          pts: 52,
          gapTooLarge: false
        };
      }
      throw new Error(`Неподдерживаемый метод`);
    };

    // 1. Посылаем pts=52. localPts=50, ожидалось 51. Обнаружена дыра. Запускается syncDifference.
    const promise52 = (syncManager as any).handleIncomingUpdate({
      type: "new_message",
      chatId,
      pts: 52,
      message: { id: "msg-52", pts: 52, text: "М52", sender: "other", chatId }
    });

    // 2. Посылаем pts=51 (запоздавшее) во время активной синхронизации.
    // Оно должно встать в очередь pendingUpdatesQueue.
    await new Promise((r) => setTimeout(r, 20)); // немного подождем, чтобы syncDifference точно начался
    
    await (syncManager as any).handleIncomingUpdate({
      type: "new_message",
      chatId,
      pts: 51,
      message: { id: "msg-51", pts: 51, text: "М51", sender: "other", chatId }
    });

    // Ждем завершения первой синхронизации
    await promise52;

    // В результате syncDifference:
    // - Накатит разницу: msg-51 и msg-52. localPts станет 52.
    // - В finally вызовет обработку очереди (где лежит pts=51).
    // - Так как localPts равен 52, pts=51 будет определен как дубликат и пропущен.
    // Проверим, что каждое сообщение доставлено ровно 1 раз.
    assert.strictEqual(syncManager.getPts(chatId), 52, "Итоговый pts чата должен быть 52");
    assert.strictEqual(receivedMessages.length, 2, "Должно быть доставлено ровно 2 сообщения");
    assert.strictEqual(receivedMessages[0].message.id, "msg-51");
    assert.strictEqual(receivedMessages[1].message.id, "msg-52");
    console.log("-> Тест 3 (события не по порядку): УСПЕШНО\n");
  }

  // -------------------------------------------------------------
  // ТЕСТ 4: Логика холодного старта при разрыве > 5000 событий
  // -------------------------------------------------------------
  console.log("Тест 4: Логика холодного старта при разрыве > 5000 событий...");
  {
    resetTestState();
    const chatId = "chat_cold_start";
    syncManager.setPts(chatId, 100);

    localStorage.setItem("local_messages_cache", JSON.stringify([{ id: "msg-cached" }]));

    let coldStartTriggered = false;
    let coldStartData: any = null;
    let loadHistoryLazyCalled = false;
    let requestedOffsetPts = 0;

    syncManager.on("cold_start", (data) => {
      coldStartTriggered = true;
      coldStartData = data;
      // Имитируем поведение UI (App.tsx): при cold_start запрашиваем компактный Inbox Snapshot
      syncManager.loadHistoryLazy(data.chatId, Math.max(0, data.pts - 20)).then(() => {
        loadHistoryLazyCalled = true;
      });
    });

    tdlib.send = async (method: string, params: any) => {
      if (method === "get_updates" || method === "updates.getDifference") {
        return {
          updates: [],
          pts: 6000,
          gapTooLarge: false // Разница 5900 > 5000 триггерит cold start
        };
      }
      if (method === "get_history") {
        requestedOffsetPts = params.offsetPts;
        return {
          messages: [
            { id: "msg-5980", pts: 5980, text: "Inbox Snapshot Message", sender: "other" }
          ],
          pts: 6000
        };
      }
      throw new Error(`Неподдерживаемый метод: ${method}`);
    };

    await syncManager.syncDifference(chatId);

    // Даем промисам завершиться
    await new Promise((r) => setTimeout(r, 20));

    assert.strictEqual(coldStartTriggered, true, "Событие cold_start должно быть сгенерировано");
    assert.strictEqual(coldStartData.chatId, chatId);
    assert.strictEqual(coldStartData.pts, 6000);
    assert.strictEqual(localStorage.getItem("local_messages_cache"), null, "Кэш сообщений должен быть очищен");
    assert.strictEqual(syncManager.getPts(chatId), 6000, "Новый pts в syncManager должен быть равен 6000");
    assert.strictEqual(loadHistoryLazyCalled, true, "Должна быть вызвана ленивая загрузка истории");
    assert.strictEqual(requestedOffsetPts, 5980, "Должна быть запрошена история с offsetPts = 5980 (компактный Inbox Snapshot)");

    console.log("-> Тест 4 (холодный старт и запрос компактного Inbox Snapshot): УСПЕШНО\n");
  }

  // -------------------------------------------------------------
  // ТЕСТ 5: Ленивая подгрузка старой истории после холодного старта
  // -------------------------------------------------------------
  console.log("Тест 5: Ленивая подгрузка старой истории после холодного старта...");
  {
    resetTestState();
    const chatId = "chat_lazy_history";
    
    // После холодного старта pts = 6000. В UI лежат сообщения до pts = 5980.
    // При прокрутке вверх UI вызывает loadHistoryLazy(chatId, 5980, 20) для подгрузки более старой истории.
    let getHistoryCalled = false;
    let offsetPtsRequested = 0;

    tdlib.send = async (method: string, params: any) => {
      if (method === "get_history") {
        getHistoryCalled = true;
        offsetPtsRequested = params.offsetPts;
        assert.strictEqual(params.chatId, chatId);
        assert.strictEqual(params.limit, 20);
        return {
          messages: [
            { id: "msg-5970", pts: 5970, text: "Еще более старое сообщение", sender: "other" }
          ],
          pts: 6000
        };
      }
      throw new Error(`Неподдерживаемый метод`);
    };

    const res = await syncManager.loadHistoryLazy(chatId, 5980, 20);

    assert.strictEqual(getHistoryCalled, true, "Должен быть вызван get_history");
    assert.strictEqual(offsetPtsRequested, 5980, "Должен быть передан offsetPts = 5980");
    assert.strictEqual(res.messages.length, 1);
    assert.strictEqual(res.messages[0].id, "msg-5970");

    console.log("-> Тест 5 (ленивая подгрузка истории): УСПЕШНО\n");
  }

  console.log("=== ВСЕ ДОПОЛНИТЕЛЬНЫХ ЭМПИРИЧЕСКИЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! ===");
}

runChallengerTests().catch((err) => {
  console.error("❌ ОШИБКА:", err);
  process.exit(1);
});
