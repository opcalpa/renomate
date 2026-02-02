import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MentionUser } from "./types";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  projectId: string;
}

export const MentionTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  onKeyDown,
  projectId,
}: MentionTextareaProps) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [teamMembers, setTeamMembers] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    if (membersLoaded) return;
    const { data } = await supabase
      .from("project_shares")
      .select("profile:profiles!project_shares_profile_id_fkey(id, name, email, avatar_url)")
      .eq("project_id", projectId);

    if (data) {
      const members: MentionUser[] = data
        .map((d) => {
          const p = d.profile as unknown as MentionUser | null;
          return p ? { id: p.id, name: p.name || p.email || "", email: p.email, avatar_url: p.avatar_url } : null;
        })
        .filter((m): m is MentionUser => m !== null);
      setTeamMembers(members);
    }
    setMembersLoaded(true);
  }, [projectId, membersLoaded]);

  const filteredMembers = teamMembers.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.email?.toLowerCase().includes(q) ?? false);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const item = dropdownRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showDropdown]);

  const insertMention = (member: MentionUser) => {
    if (mentionStartPos === null) return;
    const before = value.slice(0, mentionStartPos);
    const after = value.slice(mentionStartPos + 1 + query.length);
    const mention = `@[${member.name}](${member.id}) `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowDropdown(false);
    setMentionStartPos(null);
    setQuery("");

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = before.length + mention.length;
        el.selectionStart = pos;
        el.selectionEnd = pos;
        el.focus();
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if ((charBefore === " " || charBefore === "\n" || lastAtIndex === 0) && !/\s/.test(textAfterAt)) {
        setMentionStartPos(lastAtIndex);
        setQuery(textAfterAt);
        setShowDropdown(true);
        fetchTeamMembers();
        return;
      }
    }

    setShowDropdown(false);
    setMentionStartPos(null);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        insertMention(filteredMembers[selectedIndex]);
        return;
      }
    }
    if (showDropdown && e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      return;
    }
    onKeyDown?.(e);
  };

  const isOpen = showDropdown && filteredMembers.length > 0;

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        onBlur={() => {
          // Delay to allow click on dropdown item
          setTimeout(() => setShowDropdown(false), 150);
        }}
      />
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md z-50"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              type="button"
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm text-left ${
                index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-6 w-6">
                {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                <AvatarFallback className="text-xs">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{member.name}</div>
                {member.email && (
                  <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
