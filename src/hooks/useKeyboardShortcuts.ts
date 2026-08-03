import { useEffect } from 'react';

export interface ShortcutHandlers {
  onNewTransaction?: () => void;
  onFocusSearch?: () => void;
  onCloseModal?: () => void;
  onSubmitForm?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl + N -> Nova Transação
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (handlers.onNewTransaction) handlers.onNewTransaction();
      }

      // Ctrl + F -> Pesquisa
      if (isCtrlOrCmd && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (handlers.onFocusSearch) handlers.onFocusSearch();
      }

      // Ctrl + S -> Salvar Formulário
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (handlers.onSubmitForm) handlers.onSubmitForm();
      }

      // Esc -> Fechar Modal
      if (e.key === 'Escape') {
        if (handlers.onCloseModal) handlers.onCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
