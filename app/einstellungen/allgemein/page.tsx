"use client";

import {AppShell} from "@/components/app-shell";
import {ActionRow, SettingsGroup} from "@/components/binso-ux";

export default function Page() {
  return (
    <AppShell title="Allgemein" active="einstellungen" backHref="/einstellungen" backLabel="Einstellungen">
      <SettingsGroup title="Allgemein">
        <div className="settings-list">
          <ActionRow href="/einstellungen/allgemein/informationen" icon="file" title="Informationen" />
          <ActionRow href="/einstellungen/darstellung?accountReturn=%2Feinstellungen%2Fallgemein" icon="sun" title="Darstellung" />
          <ActionRow href="/einstellungen/sprache?accountReturn=%2Feinstellungen%2Fallgemein" icon="settings" title="Sprache" />
        </div>
      </SettingsGroup>
    </AppShell>
  );
}
