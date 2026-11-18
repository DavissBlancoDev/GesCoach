function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-5 text-center text-sm text-gray-500 sm:px-6">
      <p>
        © 2026{" "}
        <a
          href="https://github.com/DavissBlancoDev"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-gray-700 transition hover:text-green-800"
        >
          DavissBlancoDev
        </a>{" "}· GesCoach
      </p>
      <p className="mt-1">
        Software libre bajo licencia{" "}
        <a
          href="https://www.gnu.org/licenses/gpl-3.0.html"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-green-800"
        >
          GNU GPLv3
        </a>
      </p>
      <p className="mt-2 text-xs">
        <a
          href="https://github.com/DavissBlancoDev/GesCoach"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-green-800"
        >
          Ver proyecto en GitHub
        </a>
      </p>
    </footer>
  );
}

export default SiteFooter;
