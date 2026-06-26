import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNotifications, markNotificationsRead } from '../modules/notifications';

export async function handleNotifications(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const notifications = await getNotifications();
    res.status(200).json(notifications);
    return;
  }

  if (req.method === 'POST' && req.url?.includes('/read')) {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Notification IDs are required.', code: 'ERR_VALIDATION' });
      return;
    }

    await markNotificationsRead(ids);
    res.status(200).json({ message: 'Notifications marked as read.' });
    return;
  }
}
