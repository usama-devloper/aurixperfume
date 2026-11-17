import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake } from "lucide-react";

const Index = () => {
  return (
    <div className="bg-background text-foreground">
      <Hero />

      {/* Trending Collections Banner Grid */}
      <section className="py-20 lg:py-28 container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-2 block">
            Artisanal Families
          </span>
          <h2 className="text-3xl lg:text-4xl font-serif font-medium text-foreground tracking-tight">
            Curated Collections
          </h2>
          <div className="w-12 h-[1px] bg-[#C5A880] mx-auto mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link to="/products?type=perfume" className="group relative overflow-hidden rounded-lg aspect-[4/5] bg-muted shadow-sm hover:shadow-xl transition-all duration-500">
            <img 
              src="/category-woody.jpg" 
              alt="Noble Woods & Spices" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141211]/90 via-[#141211]/30 to-transparent transition-opacity duration-300"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <span className="text-[10px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase">Precious Woods</span>
              <h3 className="text-2xl font-serif font-medium text-[#FAF8F5] tracking-wide mt-1">Noble Fragrances</h3>
              <span className="inline-flex items-center text-xs font-semibold text-[#FAF8F5] tracking-[0.15em] uppercase mt-4 group-hover:text-[#C5A880] transition-colors">
                Explore Collection <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          <Link to="/products?type=perfume" className="group relative overflow-hidden rounded-lg aspect-[4/5] bg-muted shadow-sm hover:shadow-xl transition-all duration-500">
            <img 
              src="/perfume3.jpg" 
              alt="Floral & Amber Nectar" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141211]/90 via-[#141211]/30 to-transparent transition-opacity duration-300"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <span className="text-[10px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase">Floral & Amber</span>
              <h3 className="text-2xl font-serif font-medium text-[#FAF8F5] tracking-wide mt-1">Sensual Elixirs</h3>
              <span className="inline-flex items-center text-xs font-semibold text-[#FAF8F5] tracking-[0.15em] uppercase mt-4 group-hover:text-[#C5A880] transition-colors">
                Explore Collection <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          <Link to="/products?type=attar" className="group relative overflow-hidden rounded-lg aspect-[4/5] bg-muted shadow-sm hover:shadow-xl transition-all duration-500">
            <img 
              src="/category-attar.jpg" 
              alt="Pure Artisanal Attars" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141211]/90 via-[#141211]/30 to-transparent transition-opacity duration-300"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <span className="text-[10px] font-semibold tracking-[0.25em] text-[#C5A880] uppercase">Traditional Distillation</span>
              <h3 className="text-2xl font-serif font-medium text-[#FAF8F5] tracking-wide mt-1">Pure Attars</h3>
              <span className="inline-flex items-center text-xs font-semibold text-[#FAF8F5] tracking-[0.15em] uppercase mt-4 group-hover:text-[#C5A880] transition-colors">
                Explore Collection <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />
      
      {/* Brand Story Section */}
      <section className="py-20 lg:py-28 bg-[#F7F4EE] dark:bg-[#141211] border-y border-border/80">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase">
                  Maison Philosophy
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-serif font-medium text-foreground tracking-tight leading-snug">
                The Sacred Art of Haute Distillation
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                At AURIX, we believe perfume is far more than a fragrance—it is an invisible garment, a captured memory, and an evocative portrait of individuality. Our master perfumers travel across Grasse, Taif, and the orient sourcing harvest-grade naturals to compose scents that evolve intimately with your skin chemistry.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Each flacon is blended in controlled micro-batches, allowing rare agarwood resins, Bulgarian damask rose, and amber crystals to macerate into rich, long-lasting harmonies.
              </p>
              <div className="pt-2">
                <Link to="/about" className="btn-primary inline-flex px-8 py-3.5">
                  Discover Our Heritage
                </Link>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-border shadow-md">
              <img 
                alt="Artisanal perfume making" 
                className="w-full aspect-[4/3] object-cover hover:scale-105 transition-transform duration-700" 
                loading="lazy" 
                src="/images/9a9c5644-b15b-4db6-a7d6-beba9ce14427.jpg" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-[0.25em] text-[#C5A880] uppercase mb-2 block">
              Testimonials
            </span>
            <h2 className="text-3xl lg:text-4xl font-serif font-medium text-foreground tracking-tight">
              Words from Our Patrons
            </h2>
            <div className="w-12 h-[1px] bg-[#C5A880] mx-auto mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "I've searched for my signature scent for years. The Sovereign Oud has an extraordinary dry-down that lingers gracefully throughout the entire day.",
                author: "Sarah L.",
                location: "Mumbai"
              }, 
              {
                quote: "The complexity and craftsmanship are second to none. Velvet Amber opens with intoxicating spices and settles into the warmest suede imaginable.",
                author: "Michael T.",
                location: "New Delhi"
              }, 
              {
                quote: "The bespoke packaging, flacon weight, and magnetic cap evoke true French haute perfumery. It felt like receiving a precious heirloom.",
                author: "Emma R.",
                location: "Bengaluru"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-card p-8 rounded-lg border border-border/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="text-[#C5A880] text-lg mb-4">★★★★★</div>
                <p className="italic text-muted-foreground mb-6 text-sm leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-border/60 pt-4">
                  <p className="font-semibold text-xs tracking-wider uppercase text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action with Image Background */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Luxury perfume flacon" 
            src="/images/ebdae0f8-95b7-4ebd-a3be-6a869e69655f.jpg" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-[#141211]/85 backdrop-blur-[1px]"></div>
        </div>
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10 max-w-3xl">
          <span className="text-xs font-semibold tracking-[0.3em] text-[#C5A880] uppercase mb-4 block">
            Begin Your Olfactive Journey
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-[#FAF8F5] tracking-tight mb-6 leading-tight">
            Indulge in the Art of Bespoke Fragrance
          </h2>
          <p className="mb-10 text-[#FAF8F5]/80 leading-relaxed text-sm md:text-base font-light">
            Whether seeking an everyday signature or a regal evening attar, our collections offer an unforgettable journey through the world's most treasured scents.
          </p>
          <Link to="/products" className="bg-[#FAF8F5] text-[#1C1917] px-8 py-3.5 font-semibold tracking-[0.2em] uppercase text-xs hover:bg-[#C5A880] hover:text-[#1C1917] transition-all rounded-md shadow-lg inline-block">
            Shop All Fragrances
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
