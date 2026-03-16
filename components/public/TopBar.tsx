import { businessInfo } from "@/lib/public-business";

export function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[1001] bg-transparent text-white text-sm py-2 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-map-marker-alt" aria-hidden />
            <span>{businessInfo.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-envelope" aria-hidden />
            <a
              href={`mailto:${businessInfo.email}`}
              className="hover:opacity-90"
            >
              {businessInfo.email}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Follow US</span>
          <div className="flex gap-2">
            <a
              href="#"
              className="hover:opacity-80"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f" />
            </a>
            <a
              href="#"
              className="hover:opacity-80"
              aria-label="Twitter"
            >
              <i className="fab fa-twitter" />
            </a>
            <a
              href="#"
              className="hover:opacity-80"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram" />
            </a>
            <a
              href="#"
              className="hover:opacity-80"
              aria-label="LinkedIn"
            >
              <i className="fab fa-linkedin-in" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
