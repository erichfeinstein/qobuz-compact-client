const expression = `
  [...document.querySelectorAll('.NavBar, .NavBar *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      return style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        style.boxShadow !== 'none' ||
        style.borderColor !== 'rgb(0, 0, 0)';
    })
    .map((element) => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        classes: element.className,
        text: element.textContent.trim().slice(0, 40),
        background: style.backgroundColor,
        border: style.borderColor,
        shadow: style.boxShadow,
      };
    });
`;

async function inspect() {
  const targets = await fetch("http://127.0.0.1:9223/json").then((response) => response.json());
  const target = targets.find((item) => item.type === "page" && item.url.includes("qobuz.com"));
  if (!target) throw new Error("Qobuz page is not available on the local DevTools endpoint.");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener("open", () => {
    if (process.argv.includes("--reload")) {
      socket.send(JSON.stringify({ id: 1, method: "Page.reload" }));
      return;
    }
    socket.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression, returnByValue: true },
    }));
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== 1) return;
    if (process.argv.includes("--reload")) {
      socket.close();
      return;
    }
    console.log(JSON.stringify(message.result.result.value, null, 2));
    socket.close();
  });
}

inspect().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
