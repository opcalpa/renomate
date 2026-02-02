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

interface ComboboxFretextProps {
  suggestions?: string[];
  suggestionKeys?: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  id?: string;
}

export function ComboboxFretext({
  suggestions,
  suggestionKeys,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
  id,
}: ComboboxFretextProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const resolvedPlaceholder = placeholder || t('common.selectOrType', 'Select or type...');
  const resolvedSearchPlaceholder = searchPlaceholder || t('common.searchOrType', 'Search or type...');
  const resolvedEmptyText = emptyText || t('common.noSuggestionsEnterToUse', 'No suggestions. Press Enter to use.');

  // Resolve suggestions: either plain strings or i18n keys
  const resolvedSuggestions = suggestionKeys
    ? suggestionKeys.map((key) => t(key))
    : (suggestions || []);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
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

  // Filter suggestions based on input
  const filteredSuggestions = resolvedSuggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

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
            {value || resolvedPlaceholder}
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
            {filteredSuggestions.length === 0 && inputValue && (
              <CommandEmpty>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{resolvedEmptyText}</p>
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
                    {t('common.use', 'Use')} "{inputValue.trim()}"
                  </Button>
                </div>
              </CommandEmpty>
            )}
            {filteredSuggestions.length > 0 && (
              <CommandGroup>
                {filteredSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSelect(suggestion)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === suggestion ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
