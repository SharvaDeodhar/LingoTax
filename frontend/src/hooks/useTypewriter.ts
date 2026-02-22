import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
    speed?: number; // ms per character
    charsPerTick?: number;
}

export function useTypewriter(
    rawText: string,
    isDone: boolean,
    options: UseTypewriterOptions = {}
) {
    const { speed = 20, charsPerTick = 2 } = options;
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const rawTextRef = useRef(rawText);
    const displayedTextRef = useRef("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        rawTextRef.current = rawText;
    }, [rawText]);

    useEffect(() => {
        if (timerRef.current) return;

        const tick = () => {
            const currentRaw = rawTextRef.current;
            const currentDisplayed = displayedTextRef.current;

            if (currentDisplayed.length < currentRaw.length) {
                setIsTyping(true);
                const nextContent = currentRaw.slice(0, currentDisplayed.length + charsPerTick);
                displayedTextRef.current = nextContent;
                setDisplayedText(nextContent);
                timerRef.current = setTimeout(tick, speed);
            } else {
                if (isDone) {
                    setIsTyping(false);
                    timerRef.current = null;
                } else {
                    // Wait for more text
                    timerRef.current = setTimeout(tick, 50);
                }
            }
        };

        timerRef.current = setTimeout(tick, speed);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
        };
    }, [isDone, speed, charsPerTick]);

    return { displayedText, isTyping };
}
