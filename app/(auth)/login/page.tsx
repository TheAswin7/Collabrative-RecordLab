import AuthCard from '@/components/auth/AuthCard';

interface Props {
  searchParams: { confirmed?: string; error?: string };
}

export default function LoginPage({ searchParams }: Props) {
  const confirmed = searchParams.confirmed === 'true';
  const linkExpired = searchParams.error === 'link-expired';
  return <AuthCard initialMode="signin" confirmed={confirmed} linkExpired={linkExpired} />;
}
