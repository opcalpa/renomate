import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Minus, Square, Triangle, Circle, 
  DoorClosed, DoorOpen, 
  Bed, Armchair, 
  RectangleHorizontal, 
  Box, 
  Frame,
  Bath, 
  Droplets, 
  WashingMachine,
  Grid2x2,
  Refrigerator,
  CookingPot,
  Flame,
  Tv,
  Lamp,
  Shirt,
  MonitorDown,
  Square as SquareIcon,
  Sofa,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SymbolType } from "./types";

interface SymbolsLibraryProps {
  onSelectSymbol: (symbolType: SymbolType) => void;
}

const BASIC_SHAPES = [
  { type: 'line' as SymbolType, icon: Minus, label: 'Line' },
  { type: 'rectangle' as SymbolType, icon: Square, label: 'Rectangle' },
  { type: 'triangle' as SymbolType, icon: Triangle, label: 'Triangle' },
  { type: 'circle' as SymbolType, icon: Circle, label: 'Circle' },
];

const STRUCTURAL = [
  { type: 'door' as SymbolType, icon: DoorClosed, label: 'Door' },
  { type: 'window' as SymbolType, icon: DoorOpen, label: 'Window' },
  { type: 'doorstep' as SymbolType, icon: Grid2x2, label: 'Doorstep' },
  { type: 'radiator' as SymbolType, icon: SquareIcon, label: 'Radiator' },
  { type: 'curtain' as SymbolType, icon: Shirt, label: 'Curtain' },
];

const KITCHEN = [
  { type: 'floor_cabinet' as SymbolType, icon: Box, label: 'Floor Cabinet' },
  { type: 'wall_cabinet' as SymbolType, icon: Box, label: 'Wall Cabinet' },
  { type: 'sink_cabinet' as SymbolType, icon: Box, label: 'Sink Cabinet' },
  { type: 'oven' as SymbolType, icon: CookingPot, label: 'Oven' },
  { type: 'stove' as SymbolType, icon: Flame, label: 'Stove' },
  { type: 'fridge' as SymbolType, icon: Refrigerator, label: 'Fridge' },
  { type: 'dishwasher' as SymbolType, icon: WashingMachine, label: 'Dishwasher' },
];

const BATHROOM = [
  { type: 'toilet' as SymbolType, icon: WashingMachine, label: 'Toilet' },
  { type: 'shower' as SymbolType, icon: Droplets, label: 'Shower' },
  { type: 'bathtub' as SymbolType, icon: Bath, label: 'Bathtub' },
  { type: 'sink' as SymbolType, icon: Circle, label: 'Sink' },
  { type: 'mirror' as SymbolType, icon: Frame, label: 'Mirror' },
  { type: 'washing_machine' as SymbolType, icon: WashingMachine, label: 'Washing Machine' },
  { type: 'dryer' as SymbolType, icon: WashingMachine, label: 'Dryer' },
];

const FURNITURE = [
  { type: 'bed' as SymbolType, icon: Bed, label: 'Bed' },
  { type: 'bed_single' as SymbolType, icon: Bed, label: 'Single Bed' },
  { type: 'bed_double' as SymbolType, icon: Bed, label: 'Double Bed' },
  { type: 'sofa' as SymbolType, icon: Sofa, label: 'Sofa' },
  { type: 'table' as SymbolType, icon: RectangleHorizontal, label: 'Table' },
  { type: 'table_round' as SymbolType, icon: Circle, label: 'Round Table' },
  { type: 'table_square' as SymbolType, icon: Square, label: 'Square Table' },
  { type: 'table_dining' as SymbolType, icon: RectangleHorizontal, label: 'Dining Table' },
  { type: 'chair' as SymbolType, icon: Armchair, label: 'Chair' },
  { type: 'wardrobe' as SymbolType, icon: Box, label: 'Wardrobe' },
  { type: 'nightstand' as SymbolType, icon: Box, label: 'Nightstand' },
  { type: 'desk' as SymbolType, icon: RectangleHorizontal, label: 'Desk' },
  { type: 'carpet' as SymbolType, icon: Grid2x2, label: 'Carpet' },
  { type: 'lamp' as SymbolType, icon: Lamp, label: 'Lamp' },
  { type: 'tv' as SymbolType, icon: Tv, label: 'TV' },
  { type: 'closet' as SymbolType, icon: Box, label: 'Closet' },
];

export const SymbolsLibrary = ({ onSelectSymbol }: SymbolsLibraryProps) => {
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="text-sm">Object Library</CardTitle>
        <CardDescription className="text-xs">
          Click to place objects on the floor plan
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="furniture" className="h-full flex flex-col">
          <TabsList className="mx-4 mb-2 grid w-[calc(100%-2rem)] grid-cols-5">
            <TabsTrigger value="shapes" className="text-xs">Shapes</TabsTrigger>
            <TabsTrigger value="structural" className="text-xs">Structural</TabsTrigger>
            <TabsTrigger value="kitchen" className="text-xs">Kitchen</TabsTrigger>
            <TabsTrigger value="bathroom" className="text-xs">Bathroom</TabsTrigger>
            <TabsTrigger value="furniture" className="text-xs">Furniture</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 px-4">
            <TabsContent value="shapes" className="mt-0">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {BASIC_SHAPES.map((symbol) => {
                  const Icon = symbol.icon;
                  return (
                    <Button
                      key={symbol.type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center justify-center h-20 hover-scale"
                      onClick={() => onSelectSymbol(symbol.type)}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{symbol.label}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="structural" className="mt-0">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {STRUCTURAL.map((symbol) => {
                  const Icon = symbol.icon;
                  return (
                    <Button
                      key={symbol.type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center justify-center h-20 hover-scale"
                      onClick={() => onSelectSymbol(symbol.type)}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{symbol.label}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="kitchen" className="mt-0">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {KITCHEN.map((symbol) => {
                  const Icon = symbol.icon;
                  return (
                    <Button
                      key={symbol.type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center justify-center h-20 hover-scale"
                      onClick={() => onSelectSymbol(symbol.type)}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{symbol.label}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="bathroom" className="mt-0">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {BATHROOM.map((symbol) => {
                  const Icon = symbol.icon;
                  return (
                    <Button
                      key={symbol.type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center justify-center h-20 hover-scale"
                      onClick={() => onSelectSymbol(symbol.type)}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{symbol.label}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="furniture" className="mt-0">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {FURNITURE.map((symbol) => {
                  const Icon = symbol.icon;
                  return (
                    <Button
                      key={symbol.type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center justify-center h-20 hover-scale"
                      onClick={() => onSelectSymbol(symbol.type)}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{symbol.label}</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};
