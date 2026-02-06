import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { ActivityCard } from "../feed/ActivityCard";
import type { ActivityLogItem } from "../feed/types";
import type { OverviewNavigation } from "./types";

interface RecentActivitySectionProps {
  activities: ActivityLogItem[];
  navigation: OverviewNavigation;
}

export function RecentActivitySection({ activities, navigation }: RecentActivitySectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t("overview.recentActivity.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2" />
            <p className="text-sm">{t("overview.recentActivity.noActivity")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigation.onNavigateToFeed()}
          >
            {t("overview.recentActivity.viewAllActivity")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
