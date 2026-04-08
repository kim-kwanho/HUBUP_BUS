import NextAuth from 'next-auth';
import { authOptions } from '@src/lib/auth';

export { authOptions };
export default NextAuth(authOptions);
