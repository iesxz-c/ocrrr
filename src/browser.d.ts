declare namespace browser {
  namespace storage {
    namespace local {
      function get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
      function remove(keys: string | string[]): Promise<void>;
    }
  }

  namespace tabs {
    function captureVisibleTab(): Promise<string>;
  }

  namespace runtime {
    interface MessageSender {
      tab?: { id?: number };
    }

    function sendMessage(message: Record<string, unknown>): Promise<unknown>;

    namespace onMessage {
      function addListener(
        callback: (
          message: Record<string, unknown>,
          sender: MessageSender,
        ) => unknown | Promise<unknown> | void,
      ): void;
    }
  }
}
