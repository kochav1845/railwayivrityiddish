import { useState, useEffect } from "react";
import {
  Mic2,
  BarChart3,
  Globe,
  Zap,
  Star,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  Shield,
  Headphones,
  Languages,
  Send,
  Facebook,
  Twitter,
  Linkedin,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen font-sans">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-md py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-200/40 group-hover:shadow-amber-300/60 transition-shadow">
              <Mic2 size={20} className="text-white" strokeWidth={1.8} />
            </div>
            <span
              className={`text-xl font-bold transition-colors ${
                scrolled ? "text-stone-900" : "text-white"
              }`}
            >
              YidTranscribe
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Home", id: "hero" },
              { label: "About", id: "about" },
              { label: "Testimonials", id: "testimonials" },
              { label: "Contact", id: "contact" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`text-sm font-medium transition-colors hover:text-amber-500 ${
                  scrolled ? "text-stone-700" : "text-white/90"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={onGetStarted}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md shadow-amber-200/30 hover:shadow-lg hover:shadow-amber-200/50"
            >
              Get Started
            </button>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg"
          >
            {mobileMenuOpen ? (
              <X size={24} className={scrolled ? "text-stone-900" : "text-white"} />
            ) : (
              <Menu size={24} className={scrolled ? "text-stone-900" : "text-white"} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 shadow-xl animate-fade-in">
            <div className="px-6 py-4 space-y-1">
              {[
                { label: "Home", id: "hero" },
                { label: "About", id: "about" },
                { label: "Testimonials", id: "testimonials" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="block w-full text-left px-4 py-3 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={onGetStarted}
                className="w-full mt-2 bg-amber-500 text-white font-semibold py-3 rounded-lg text-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      <section
        id="hero"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-8">
              <Zap size={14} className="text-amber-400" />
              <span className="text-white/80 text-sm">AI-Powered Transcription</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Transcribe Yiddish
              <br />
              <em className="not-italic bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                with AI Precision
              </em>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-lg">
              Transform spoken Yiddish into accurate text instantly. Our advanced
              AI model understands dialect nuances and delivers professional-grade
              transcriptions.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30"
              >
                Start Transcribing
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo("about")}
                className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-white/90 font-medium px-8 py-4 rounded-xl transition-all hover:bg-white/5"
              >
                Learn More
              </button>
            </div>
          </div>

          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent rounded-3xl blur-2xl scale-110" />
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 w-[420px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Mic2 size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-white/20 rounded-full w-3/4 mb-2" />
                      <div className="h-2 bg-white/10 rounded-full w-1/2" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm font-hebrew leading-relaxed" dir="rtl">
                      דאס איז א ביישפיל פון א טראנסקריפציע...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-amber-500/20 rounded-lg flex-1" />
                    <div className="h-8 bg-white/10 rounded-lg flex-1" />
                    <div className="h-8 bg-white/10 rounded-lg w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                icon: <BarChart3 size={28} className="text-amber-500" />,
                title: "Trend Analysis",
                desc: "Advanced AI models trained on extensive Yiddish speech data, continuously improving accuracy across all dialects.",
              },
              {
                num: "02",
                icon: <Globe size={28} className="text-amber-500" />,
                title: "Multi-Language Output",
                desc: "Transcribe Yiddish speech and get results in Yiddish, Hebrew, English, or other supported languages instantly.",
              },
              {
                num: "03",
                icon: <Zap size={28} className="text-amber-500" />,
                title: "Lightning Fast",
                desc: "Get your transcriptions back in seconds, not minutes. Our optimized pipeline delivers results at incredible speed.",
              },
            ].map((feature) => (
              <div
                key={feature.num}
                className="group bg-stone-50 hover:bg-white border border-stone-100 hover:border-amber-200 rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-xl hover:shadow-amber-100/30 hover:-translate-y-1"
              >
                <span className="text-5xl font-bold text-stone-100 group-hover:text-amber-100 transition-colors">
                  {feature.num}
                </span>
                <div className="w-16 h-16 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center mx-auto mt-4 mb-5 transition-colors">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-bold text-stone-900 mb-3">{feature.title}</h4>
                <p className="text-stone-500 text-sm leading-relaxed mb-5">{feature.desc}</p>
                <button
                  onClick={() => scrollTo("testimonials")}
                  className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors"
                >
                  Read More <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-amber-100 to-transparent rounded-3xl" />
              <img
                src="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600"
                alt="Person using transcription app"
                className="relative rounded-2xl shadow-2xl shadow-stone-200/50 w-full object-cover aspect-[4/3]"
              />
            </div>
            <div className="space-y-8">
              {[
                {
                  icon: <Shield size={24} className="text-amber-500" />,
                  title: "Secure & Private",
                  desc: "Your audio files are processed securely. We value your privacy and ensure all data is handled with the highest security standards.",
                },
                {
                  icon: <Headphones size={24} className="text-amber-500" />,
                  title: "Multiple Audio Formats",
                  desc: "Upload audio in any popular format or record directly from your browser. Our system handles WAV, MP3, M4A, and more.",
                },
                {
                  icon: <Languages size={24} className="text-amber-500" />,
                  title: "Cross-Language Translation",
                  desc: "Not just transcription - translate your Yiddish audio into Hebrew, English, and other languages with a single click.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h4>
                    <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              What They Think <em className="not-italic text-amber-500">About Us</em>
            </h2>
            <p className="text-stone-500 leading-relaxed">
              Trusted by transcribers, researchers, and Yiddish enthusiasts worldwide.
              See what our users have to say.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Jonathan Smart",
                role: "Language Researcher",
                stars: 5,
                text: "The accuracy on Yiddish dialects is remarkable. This has transformed our research workflow completely.",
              },
              {
                name: "Martino Tino",
                role: "Content Creator",
                stars: 5,
                text: "Fast, reliable, and the multi-language output is a game changer for creating bilingual content.",
              },
              {
                name: "George Tasa",
                role: "Archivist",
                stars: 3,
                text: "Great tool for digitizing old Yiddish recordings. The transcription quality keeps improving.",
              },
              {
                name: "Sir James",
                role: "Educator",
                stars: 4,
                text: "My students love using this for their Yiddish language studies. Makes learning so much more accessible.",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-gradient-to-br from-stone-50 to-amber-50/30 border border-stone-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-amber-100/20 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{testimonial.name}</h4>
                    <span className="text-stone-400 text-xs">{testimonial.role}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-stone-600 text-sm leading-relaxed">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="bg-white/10 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm"
                  />
                  <input
                    type="email"
                    placeholder="E-Mail Address"
                    className="bg-white/10 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm"
                  />
                </div>
                <textarea
                  rows={5}
                  placeholder="Your Message"
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm resize-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20"
                >
                  <Send size={16} />
                  Send Message
                </button>
              </form>
            </div>

            <div className="lg:pl-12">
              <h2 className="text-2xl font-bold mb-4">
                More About <em className="not-italic text-amber-400">YidTranscribe</em>
              </h2>
              <p className="text-white/60 leading-relaxed mb-8 text-sm">
                YidTranscribe is an AI-powered platform dedicated to preserving and
                digitizing Yiddish speech. Built on cutting-edge whisper models fine-tuned
                for Yiddish, we deliver the most accurate Yiddish transcription available today.
                Whether you are a researcher, educator, or language enthusiast, our tools
                make Yiddish accessible to everyone.
              </p>
              <div className="flex gap-3">
                {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-amber-500 flex items-center justify-center transition-all duration-200"
                  >
                    <Icon size={16} className="text-white" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              Copyright 2026 YidTranscribe. All rights reserved.
            </p>
            <button
              onClick={onGetStarted}
              className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
            >
              Sign In to Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
