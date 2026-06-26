import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCustomerProfiles, upsertCustomerProfiles } from '../modules/customers';

export async function handleCustomers(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    const profiles = await getCustomerProfiles();
    res.status(200).json(profiles);
    return;
  }

  if (req.method === 'POST') {
    const { profiles } = req.body || {};
    if (!Array.isArray(profiles)) {
      res.status(400).json({ message: 'profiles array is required.', code: 'ERR_VALIDATION' });
      return;
    }

    await upsertCustomerProfiles(profiles);
    res.status(200).json({ message: 'Customer profiles updated.', count: profiles.length });
    return;
  }
}
