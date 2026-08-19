console.log('background loaded');

browser.runtime.onMessage.addListener(
  (message: { type?: string }, _sender: browser.runtime.MessageSender) => {
    if (message.type !== 'captureVisibleTab') return;

    return browser.tabs.captureVisibleTab().then(
      (dataUrl) => ({ dataUrl }),
      (err: unknown) => ({ error: String(err) }),
    );
  },
);
