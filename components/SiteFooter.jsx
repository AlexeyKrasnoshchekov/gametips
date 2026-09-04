// Общий футер сайта: дисклеймер и ссылки на юридические документы.
// Без интерактива — одинаковая разметка на всех страницах.
export default function SiteFooter() {
  return (
    <footer>
      <p>
        <i className="fa-solid fa-triangle-exclamation"></i> Betting involves
        risk. Information is provided for guidance only; responsibility for
        decisions lies with the user.
      </p>
      <div className="footer-legal">
        <a className="footer-privacy" href="/privacy">
          <i className="fa-solid fa-shield-halved"></i> Privacy Policy
        </a>
        <a className="footer-privacy" href="/terms">
          <i className="fa-solid fa-file-contract"></i> Terms of Service
        </a>
        <a className="footer-privacy" href="/cookies">
          <i className="fa-solid fa-cookie-bite"></i> Cookie Policy
        </a>
      </div>
    </footer>
  );
}
