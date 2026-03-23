import { AppLayout } from "@/components/layout/app-layout";
import { PropertyMap } from "@/components/property-map";
import { MapPin } from "lucide-react";

export default function PropertyLocations() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">Property Locations</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Geographic overview of all properties across the portfolio. Click any pin for details.
          </p>
        </div>
        <PropertyMap />
      </div>
    </AppLayout>
  );
}
