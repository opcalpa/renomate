import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label?: string;
  labelKey?: string;
}

interface ComboboxSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  id?: string;
}

/**
 * A combobox that shows predefined options (with i18n labelKey support)
 * but also allows the user to type a custom value and press Enter.
 */
export function ComboboxSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  className,
  id,
}: ComboboxSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const resolvedPlaceholder = placeholder || t("common.selectOrType", "Select or type...");
  const resolvedSearchPlaceholder = searchPlaceholder || t("common.searchOrType", "Search or type...");

  const getLabel = (opt: Option) =>
    opt.labelKey ? t(opt.labelKey) : opt.label || opt.value;

  // Find display label for current value
  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption ? getLabel(selectedOption) : value;

  // Filter options based on input
  const filtered = options.filter((opt) =>
    getLabel(opt).toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setInputValue("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onChange(inputValue.trim());
      setOpen(false);
      setInputValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? displayValue : resolvedPlaceholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={resolvedSearchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleInputKeyDown}
          />
          <CommandList>
            {filtered.length === 0 && inputValue && (
              <CommandEmpty>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("common.noSuggestionsEnterToUse", "No suggestions. Press Enter to use.")}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      onChange(inputValue.trim());
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    {t("common.use", "Use")} &quot;{inputValue.trim()}&quot;
                  </Button>
                </div>
              </CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getLabel(opt)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* Show "Use custom" button when input doesn't match any option */}
            {filtered.length > 0 && inputValue.trim() && !filtered.some(
              (o) => getLabel(o).toLowerCase() === inputValue.trim().toLowerCase() || o.value === inputValue.trim()
            ) && (
              <CommandGroup>
                <CommandItem
                  value={`__custom__${inputValue.trim()}`}
                  onSelect={() => {
                    onChange(inputValue.trim());
                    setOpen(false);
                    setInputValue("");
                  }}
                >
                  <span className="text-primary">+</span>
                  <span className="ml-2">
                    {t("common.use", "Use")} &quot;{inputValue.trim()}&quot;
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
