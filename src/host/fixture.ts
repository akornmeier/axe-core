// Trusted test target, intercepted inside owned Playwright contexts. No network server.
export const FIXTURE_URL = "http://propellr.invalid/dialog";
export const DIALOG_HTML = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Dialog fixture</title>
<body data-propellr-fixture="dialog-v1">
<button id="open" type="button">Open dialog</button>
<dialog id="dialog" aria-labelledby="title"><h1 id="title">Test dialog</h1>
<button id="close" type="button">Close dialog</button></dialog>
<script>
const opener = document.querySelector('#open');
const dialog = document.querySelector('#dialog');
opener.addEventListener('click', () => dialog.showModal());
document.querySelector('#close').addEventListener('click', () => {
  dialog.close(); opener.focus();
});
</script></body></html>`;
