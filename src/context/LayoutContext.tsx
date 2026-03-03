import { createContext, useContext } from 'react';

export type LayoutContextValue = {
  openReleve: () => void;
  openAchat: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutActions() {
  return useContext(LayoutContext);
}

export function LayoutActionsProvider({
  value,
  children,
}: {
  value: LayoutContextValue;
  children: React.ReactNode;
}) {
  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}
