import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommentInput {
  id: string;
  content: string;
}

export function useCommentTranslation() {
  const { t, i18n } = useTranslation();
  const [translationsEnabled, setTranslationsEnabled] = useState(false);
  const [translating, setTranslating] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const targetLang = i18n.language;

  const toggleTranslations = useCallback(
    async (comments: CommentInput[]) => {
      if (translationsEnabled) {
        setTranslationsEnabled(false);
        return;
      }

      // Check which comments need translation
      const uncached = comments.filter(
        (c) => !cacheRef.current.has(`${c.id}:${targetLang}`)
      );

      if (uncached.length === 0) {
        setTranslationsEnabled(true);
        return;
      }

      setTranslating(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "translate-comments",
          {
            body: {
              comments: uncached.map((c) => ({ id: c.id, content: c.content })),
              targetLanguage: targetLang,
            },
          }
        );

        if (error) throw error;

        const translations: { id: string; translatedContent: string }[] =
          data?.translations ?? [];

        for (const item of translations) {
          cacheRef.current.set(`${item.id}:${targetLang}`, item.translatedContent);
        }

        setTranslationsEnabled(true);
      } catch (err) {
        console.error("Translation error:", err);
        toast.error(t("comments.translationError", "Could not translate comments"));
      } finally {
        setTranslating(false);
      }
    },
    [translationsEnabled, targetLang, t]
  );

  const getTranslatedContent = useCallback(
    (id: string, original: string): string => {
      if (!translationsEnabled) return original;
      return cacheRef.current.get(`${id}:${targetLang}`) ?? original;
    },
    [translationsEnabled, targetLang]
  );

  return {
    translationsEnabled,
    translating,
    toggleTranslations,
    getTranslatedContent,
    targetLang,
  };
}
