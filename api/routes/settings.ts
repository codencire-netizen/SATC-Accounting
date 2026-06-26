import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSettings, storeSettings } from '../modules/settings';

export async function handleSettings(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const settings = await getSettings();
    res.status(200).json(settings);
    return;
  }

  if (req.method === 'POST') {
    const settings = req.body || {};
    await storeSettings(settings);
    res.status(200).json({ message: 'Settings saved.', settings });
    return;
  }
}
