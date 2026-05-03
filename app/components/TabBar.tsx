'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = { student: 'matthew' | 'michael' | 'brynne'; };

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconFlash() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconExam() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconClasses() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 19V7L12 3L20 7V19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <rect x="9" y="13" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M4 7L12 11L20 7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

export default function TabBar({ student }: Props) {
  const pathname = usePathname();

  const leftTabs = [
    { label: 'Home', href: `/${student}`, icon: IconHome },
    { label: 'Cards', href: `/${student}/flashcards`, icon: IconFlash },
  ];

  const rightTabs = [
    { label: 'Exam', href: `/${student}/practice-exam`, icon: IconExam },
    { label: 'Classes', href: `/${student}/add-class`, icon: IconClasses },
  ];

  const isActive = (href: string) => {
    if (href === `/${student}`) return pathname === `/${student}`;
    return pathname.startsWith(href);
  };

  const tabStyle = (href: string) => ({
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    padding: '6px 16px',
    borderRadius: 12,
    color: isActive(href) ? '#7B6FA0' : '#C4C1D4',
    transition: 'color 0.15s',
    flex: 1,
  });

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'rgba(250,250,248,0.97)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid #E8E5F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {leftTabs.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} style={tabStyle(href)}>
          <Icon />
          <span style={{ fontSize: 9, fontWeight: isActive(href) ? 800 : 600, letterSpacing: 0.3, fontFamily: 'var(--font-jakarta)' }}>{label}</span>
        </Link>
      ))}

      {/* Center FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          onClick={() => alert('Task manager coming soon!')}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(135deg, #7B6FA0, #5A5078)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(123,111,160,0.4)',
            marginBottom: 12,
            padding: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="10" y1="4" x2="10" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {rightTabs.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} style={tabStyle(href)}>
          <Icon />
          <span style={{ fontSize: 9, fontWeight: isActive(href) ? 800 : 600, letterSpacing: 0.3, fontFamily: 'var(--font-jakarta)' }}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}