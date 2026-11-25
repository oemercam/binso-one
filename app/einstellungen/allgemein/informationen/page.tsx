import {AppShell} from "@/components/app-shell";
import {ListRow, SettingsGroup} from "@/components/binso-ux";
import {legalConfig} from "@/config/legal";
import {version} from "@/package.json";

export default function Page() {
  return (
    <AppShell title="Informationen" active="einstellungen" backHref="/einstellungen/allgemein" backLabel="Allgemein">
      <SettingsGroup title="App-Informationen">
        <div className="settings-list">
          <ListRow title="App-Name" meta="Binso One" />
          <ListRow title="Version" meta={version} />
          <ListRow title="Plattform" meta="Web / PWA" />
          <ListRow title="Herausgeber" meta={legalConfig.company.name} />
        </div>
      </SettingsGroup>
    </AppShell>
  );
}
