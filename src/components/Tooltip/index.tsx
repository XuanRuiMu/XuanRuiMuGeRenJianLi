import { useState, type ReactNode } from "react";

type Props = {
  children?: ReactNode;
  class?: string;
};

const MESSAGES = [
  "Hi there!",
  "Clicked again?",
  "Still here?",
  "Persistent, aren't you?",
  "What's up?",
  "Again? Really?",
  "You're curious!",
  "Not cool!",
  "Give it a break!",
  "That's annoying!",
  "Hands off!",
  "No more clicks!",
  "Seriously?!",
  "Ouch! That hurts!",
  "You're persistent!",
  "Why the curiosity?",
  "I'm getting tired!",
  "I'm bored!",
  "Enough's enough!",
  "Find another hobby!",
  "Stop, please!",
  "Okay, last one!",
  "That's it, I'm done!",
];

export default function Tooltip(props: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const currentMessage = () => {
    const count = clickCount;
    if (count >= MESSAGES.length) {
      return MESSAGES[MESSAGES.length - 1];
    }
    return MESSAGES[count];
  };

  const handlePressStart = () => {
    setIsVisible((v) => !v);
    if (isVisible) {
      setClickCount((c) => c + 1);
    }
  };

  return (
    <div className={`h-full relative inline-block ${props.class ?? ""}`}>
      <div
        className="h-full"
        onMouseDown={handlePressStart}
        onMouseUp={() => setIsVisible(false)}
        onTouchStart={handlePressStart}
        onTouchEnd={() => setIsVisible(false)}
      >
        {props.children}
      </div>

      {isVisible && (
        <div className="tt-shell absolute left-1/2 -translate-x-1/2 -translate-y-26 mt-1 z-10">
          <div className="tt--ns w-auto max-h-[70px] p-2 bg-black text-white text-center rounded-lg shadow-custom shadow-primary-500 border border-primary-500 whitespace-normal after:content-[''] after:block after:rotate-45 after:w-4 after:h-4 after:shadow-custom after:shadow-primary-500 after:absolute after:-bottom-2 after:-translate-x-1/2 after:left-1/2 after:bg-black after:z-20">
            <p className="w-max">{currentMessage()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
