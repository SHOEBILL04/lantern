import { Link } from "react-router-dom";
import { FaGithub } from "react-icons/fa";

// Background + main logo
import bg from "../../assets/images/about-bg.png";
import lanternLogo from "../../assets/images/logo.png";

// Team photos (put them in src/assets/images/team/)
import member1 from "../../assets/images/team/member1.jpeg";
import member2 from "../../assets/images/team/member2.jpeg";
import member3 from "../../assets/images/team/member3.jpeg";
import member4 from "../../assets/images/team/member4.jpeg";

export default function About() {
  const team = [
    {
      name: "Aftab Ahmed Fahim",
      role: "Lead",
      github: "https://github.com/AftabAhmedFahim",
      image: member1,
    },
    {
      name: "Rakibul Islam Emon",
      role: "Backend Developer",
      github: "https://github.com/SHOEBILL04",
      image: member2,
    },
    {
      name: "Rubaiat Rabib",
      role: "Frontend Developer",
      github: "https://github.com/sloth-262",
      image: member3,
    },
    {
      name: "Saiman Ullah",
      role: "Frontend + Backend Developer",
      github: "https://github.com/saiman4113",
      image: member4,
    },
  ];

  return (
    <main
      className="min-h-screen text-white"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for readability */}
      <div className="min-h-screen bg-black/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          {/* Top-left brand (click to homepage) */}
          <Link
                to="/"
                className="flex items-center gap-3 absolute top-8 left-10 select-none"
                >
                <img
                    src={lanternLogo}
                    alt="Lantern Logo"
                    className="w-9 h-9 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    draggable="false"
                />
                <span
                    className="text-3xl tracking-widest text-sky-400 hover:text-sky-300 transition"
                    style={{
                    fontFamily: "Monsta Fectro",
                    textShadow: "0 0 18px rgba(56,189,248,0.5)",
                    }}
                >
                    LANTERN
                </span>
            </Link>

          {/* HERO */}
          <section className="mt-12 grid items-center gap-10 md:grid-cols-2">
            {/* Left: logo */}
            <div className="flex justify-center md:justify-start">
              <img
                src={lanternLogo}
                alt="Lantern logo"
                className="w-[280px] md:w-[360px] drop-shadow-[0_0_40px_rgba(56,189,248,0.25)]"
              />
            </div>

            {/* Right: text */}
            <div className="md:pl-6">
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
                About Us
              </h1>

              <p className="mt-6 text-white/80 leading-7">
                Lantern is a student-built platform focused on making learning clearer,
                faster, and more organized. We’re designing a clean experience that feels
                modern, calm, and easy to use.
              </p>

              <p className="mt-4 text-white/80 leading-7">
                Our goal is to build pages that look professional and stay consistent
                across the whole website — with smooth spacing, strong typography, and a
                dark theme that matches the Lantern identity.
              </p>

              <p className="mt-4 text-white/80 leading-7">
                This project is built collaboratively. Below you’ll find our team members
                and their roles, with GitHub links to their work.
              </p>
            </div>
          </section>

          {/* TEAM */}
          <section className="mt-16 md:mt-24">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <h2 className="text-2xl md:text-3xl font-semibold">Our Team</h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((m) => (
                <article
                  key={m.github}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 hover:-translate-y-1 transition"
                >
                  {/* Photo circle */}
                  <div className="mx-auto h-24 w-24 rounded-full overflow-hidden border border-sky-400/40 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold">{m.name}</h3>
                  <p className="mt-1 text-sky-200/80 text-sm">{m.role}</p>

                  <a
                    href={m.github}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-sky-300 hover:text-black transition"
                  >
                    <FaGithub className="text-lg" />
                    GitHub
                  </a>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}