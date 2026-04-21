import { useEffect } from '@lynx-js/react';
import { useTamerRouter } from '@tamer4lynx/tamer-router';
import { Screen } from '@tamer4lynx/tamer-screen';
import { Slot, Stack } from '@tamer4lynx/tamer-router';

export default function IndexRedirect() {
  const { replace } = useTamerRouter();

  useEffect(() => {
    'background only';
    replace('/tabs');
  }, [replace]);

  return <Slot />;
}
