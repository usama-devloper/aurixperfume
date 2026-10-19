import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div>
      <Hero />

      {/* Categories Banner Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-black tracking-widest text-center mb-12 uppercase">Trending Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/products?type=perfume" className="relative group overflow-hidden block aspect-[4/5] bg-neutral-100">
            <img 
              src="/category-woody.jpg" 
              alt="Men's Fragrances" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/40"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-300 uppercase">Premium</span>
              <h3 className="text-2xl font-black text-white tracking-wider uppercase mt-1">Men's Perfumes</h3>
              <span className="inline-flex items-center text-xs font-semibold text-white tracking-widest uppercase mt-4 group-hover:underline">
                Shop Now <span className="ml-1 text-sm">→</span>
              </span>
            </div>
          </Link>
          <Link to="/products?type=perfume" className="relative group overflow-hidden block aspect-[4/5] bg-neutral-100">
            <img 
              src="/perfume3.jpg" 
              alt="Women's Fragrances" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/40"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-300 uppercase">Sensual</span>
              <h3 className="text-2xl font-black text-white tracking-wider uppercase mt-1">Women's Perfumes</h3>
              <span className="inline-flex items-center text-xs font-semibold text-white tracking-widest uppercase mt-4 group-hover:underline">
                Shop Now <span className="ml-1 text-sm">→</span>
              </span>
            </div>
          </Link>
          <Link to="/products?type=attar" className="relative group overflow-hidden block aspect-[4/5] bg-neutral-100">
            <img 
              src="/category-attar.jpg" 
              alt="Exclusive Attars" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/40"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="text-[10px] font-bold tracking-[0.25em] text-neutral-300 uppercase">Traditional</span>
              <h3 className="text-2xl font-black text-white tracking-wider uppercase mt-1">Exclusive Attars</h3>
              <span className="inline-flex items-center text-xs font-semibold text-white tracking-widest uppercase mt-4 group-hover:underline">
                Shop Now <span className="ml-1 text-sm">→</span>
              </span>
            </div>
          </Link>
        </div>
      </div>

      <FeaturedProducts />
      
      {/* Brand Story Section */}
      <div className="container mx-auto px-4 py-20 border-t border-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-perfume-gold uppercase">Our Identity</span>
            <h2 className="text-3xl font-black tracking-widest uppercase mb-6 mt-2 text-white">The Art of Fragrance</h2>
            <p className="mb-4 text-neutral-400 leading-relaxed text-sm">
              At AURIX, we believe perfume is more than a fragrance—it's an expression of identity, a captured memory, 
              a statement of intention. Our master perfumers travel the world sourcing the finest ingredients to create 
              compositions that tell a story on your skin.
            </p>
            <p className="mb-8 text-neutral-400 leading-relaxed text-sm">
              Each bottle contains not just perfume, but a journey of scents that unfolds uniquely with your chemistry, 
              creating a truly personal experience.
            </p>
            <Link to="/about" className="btn-secondary inline-block">
              Our Philosophy
            </Link>
          </div>
          <div className="rounded-none overflow-hidden border border-neutral-800 shadow-sm">
            <img 
              alt="Luxury perfume collection" 
              className="w-full aspect-[4/3] object-cover" 
              loading="lazy" 
              src="/images/9a9c5644-b15b-4db6-a7d6-beba9ce14427.jpg" 
            />
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-[#111111] py-20 border-t border-neutral-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-black tracking-widest text-center mb-12 uppercase text-white">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "I've found my signature scent at last. Ethereal Bloom has become part of my identity.",
                author: "Sarah L."
              }, 
              {
                quote: "The attention to detail in these fragrances is remarkable. Midnight Velvet lasts all day and evolves beautifully.",
                author: "Michael T."
              }, 
              {
                quote: "The packaging is as luxurious as the scent itself. Makes for a perfect gift!",
                author: "Emma R."
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-neutral-900 p-8 rounded-none border border-neutral-800 shadow-sm flex flex-col justify-between">
                <p className="italic text-neutral-400 mb-6 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <p className="font-bold text-xs uppercase tracking-wider text-perfume-gold">— {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefit Banner */}
      <div className="bg-neutral-900 py-10 border-y border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-neutral-800">
            <div className="py-2 md:py-0">
              <h3 className="font-sans text-xs font-black tracking-widest text-white uppercase">Free Shipping</h3>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Available on all items</p>
            </div>
            <div className="py-2 md:py-0">
              <h3 className="font-sans text-xs font-black tracking-widest text-white uppercase">Returns & Exchanges</h3>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Up to 14 days after delivery</p>
            </div>
            <div className="py-2 md:py-0">
              <h3 className="font-sans text-xs font-black tracking-widest text-white uppercase">Warranty</h3>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Up to 6 months</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action with Image Background */}
      <div className="relative py-24">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Luxury perfume" 
            src="/images/ebdae0f8-95b7-4ebd-a3be-6a869e69655f.jpg" 
            className="w-full h-full object-cover opacity-30" 
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-black tracking-widest mb-6 text-white uppercase">Begin Your Scent Journey</h2>
          <p className="max-w-2xl mx-auto mb-10 text-neutral-300 leading-relaxed text-sm">
            Explore our exquisite collection of fragrances and discover the perfect scent that resonates with your style and personality.
          </p>
          <Link to="/products" className="btn-primary inline-block">
            Shop All Fragrances
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;