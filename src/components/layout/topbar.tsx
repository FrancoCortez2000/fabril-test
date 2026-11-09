import { CommandMenu } from "@/components/layout/command-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { DemoBadge } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import type { AppSession } from "@/fixtures/session";

export function Topbar({ session }: { session: AppSession }) {
  const activeOrg = session.organizations.find((o) => o.id === session.activeOrganizationId);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/75 md:px-6">
      <MobileNav session={session} />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CommandMenu />
        {activeOrg?.isDemo ? <DemoBadge className="shrink-0 lg:hidden" /> : null}
      </div>
      <div className="flex items-center gap-1">
        <NotificationsMenu />
        <UserMenu user={session.user} />
      </div>
    </header>
  );
}
