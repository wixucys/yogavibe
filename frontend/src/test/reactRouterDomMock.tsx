import React, { createContext, useContext, useMemo, useState } from 'react';

type SearchParamsSetter = (
  nextInit: URLSearchParams | string | Record<string, string> | [string, string][]
) => void;

interface RouterState {
  pathname: string;
  search: string;
  navigate: (to: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: SearchParamsSetter;
}

const RouterContext = createContext<RouterState>({
  pathname: '/',
  search: '',
  navigate: () => undefined,
  searchParams: new URLSearchParams(),
  setSearchParams: () => undefined,
});

const toSearchParams = (
  nextInit: URLSearchParams | string | Record<string, string> | [string, string][]
): URLSearchParams => {
  if (nextInit instanceof URLSearchParams) {
    return new URLSearchParams(nextInit);
  }

  if (typeof nextInit === 'string') {
    return new URLSearchParams(nextInit);
  }

  if (Array.isArray(nextInit)) {
    return new URLSearchParams(nextInit);
  }

  return new URLSearchParams(nextInit);
};

const RouterProvider = ({
  children,
  initialEntry = '/',
}: {
  children: React.ReactNode;
  initialEntry?: string;
}) => {
  const [pathname, setPathname] = useState(initialEntry.split('?')[0] || '/');
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParamsState] = useState(new URLSearchParams());

  const value = useMemo<RouterState>(
    () => ({
      pathname,
      search,
      navigate: (to: string) => {
        const [nextPath, nextSearch = ''] = to.split('?');
        setPathname(nextPath || '/');
        setSearch(nextSearch ? `?${nextSearch}` : '');
        setSearchParamsState(new URLSearchParams(nextSearch));
      },
      searchParams,
      setSearchParams: (nextInit) => {
        const next = toSearchParams(nextInit);
        setSearchParamsState(next);
        setSearch(next.toString() ? `?${next.toString()}` : '');
      },
    }),
    [pathname, search, searchParams]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const MemoryRouter = ({
  children,
  initialEntries,
}: {
  children: React.ReactNode;
  initialEntries?: string[];
}) => <RouterProvider initialEntry={initialEntries?.[0] ?? '/'}>{children}</RouterProvider>;

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => (
  <RouterProvider>{children}</RouterProvider>
);

export const Link = ({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { navigate } = useContext(RouterContext);

  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
};

export const Navigate = ({ to }: { to: string; replace?: boolean }) => {
  return <div>{`Redirect:${to}`}</div>;
};

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export const useLocation = () => {
  const { pathname, search } = useContext(RouterContext);
  return { pathname, search };
};

export const useSearchParams = (): [URLSearchParams, SearchParamsSetter] => {
  const { searchParams, setSearchParams } = useContext(RouterContext);
  return [searchParams, setSearchParams];
};

export const Route = ({ element }: { element: React.ReactNode; path?: string }) => (
  <>{element}</>
);

export const Routes = ({ children }: { children: React.ReactNode }) => <>{children}</>;
