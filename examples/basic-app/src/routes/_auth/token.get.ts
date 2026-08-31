import { t } from '@taserjs/router';
import { json } from '@taserjs/router/reply';

export default t.get('/token').handler((_ctx) => {
  return json({ ok: true });
});
