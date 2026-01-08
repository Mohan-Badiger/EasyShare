import React from 'react'
import { Link } from 'react-router-dom'
import contact from '../assets/contact.png'

const Hero = () => {

    return (
        <div className="sm:min-h-screen">
            <div className='h-[84vh] sm:h-[92vh]'>
                {/* Navbar */}
                <nav className="z-50 flex items-center justify-between w-full pt-6 py-4 px-6 md:px-16 lg:px-24 xl:px-40 text-sm">
                    <Link to="/">
                        <p className='text-2xl sm:text-3xl font-semibold text-slate-800'>Easy<span className=' bg-linear-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent text-nowrap'>Share</span></p>
                    </Link>

                    <div className="flex gap-2">
                        <Link to='/easyshare' className="hidden md:block px-6 py-2 bg-indigo-500 hover:bg-indigo-700 active:scale-95 transition-all rounded-full text-white">
                            Get started
                        </Link>
                        <a href="https://mohanbadiger.vercel.app" target='_blank' className="hidden md:block px-6 py-2 border active:scale-95 hover:bg-slate-50 transition-all rounded-full text-slate-700 hover:text-slate-900" >
                            Contact
                        </a>
                    </div>

                </nav>

                {/* Hero Section */}
                <div className="relative flex flex-col items-center justify-center text-sm px-4 md:px-16 lg:px-24 xl:px-40 text-black">
                    <div className="absolute top-28 xl:top-10 -z-10 left-1/4 size-72 sm:size-96 xl:size-120 2xl:size-132 bg-indigo-300 blur-[100px] opacity-30"></div>

                    {/* Avatars + Stars */}
                    <div className="flex items-center mt-35 sm:mt-28">
                        <div className="flex -space-x-3 pr-3">
                            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200" alt="user3" className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-1" />
                            <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200" alt="user1" className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-2" />
                            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200" alt="user2" className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-3" />
                            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200" alt="user3" className="size-8 object-cover rounded-full border-2 border-white hover:-translate-y-0.5 transition z-4" />
                            <img src="https://randomuser.me/api/portraits/men/75.jpg" alt="user5" className="size-8 rounded-full border-2 border-white hover:-translate-y-0.5 transition z-5" />
                        </div>

                        <div>
                            <div className="flex ">
                                {Array(5).fill(0).map((_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star text-transparent fill-indigo-600" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                                ))}
                            </div>
                            <p className="text-sm text-gray-700">
                                Used by 100+ users
                            </p>
                        </div>
                    </div>

                    {/* Headline + CTA */}
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold max-w-5xl text-center mt-3 md:leading-[70px]">
                        EasyShare <span className=" bg-linear-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent text-nowrap">Effortless </span><br /> File Sharing.
                    </h1>

                    <p className="max-w-md text-center text-base my-7">The Easiest Way to Send & Receive Files Instantly.</p>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4 ">
                        <Link to='/easyshare' className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-9 h-12 m-1 ring-offset-2 ring-1 ring-indigo-400 flex items-center transition-colors">
                            Get started
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-1 size-4" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                        </Link>
                        <a href='https://mohanbadiger.vercel.app' target='_blank' className="md:hidden flex items-center gap-2 border border-slate-400 hover:bg-indigo-50 transition rounded-full px-7 h-12 text-slate-700">
                            <img className='w-5 text-slate-700 opacity-70' src={contact} alt="" />
                            <span>Contact</span>
                        </a>
                    </div>
    
                </div>
            </div>
            <footer className="w-full font-Poppins">
                <div className="w-full mx-auto mb-3 flex flex-col items-center">
                    <p className="text-center max-w-xl text-md font-semibold text-gray-700 leading-relaxed">
                        Developed By Mohan Badiger
                    </p>
                    <p className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} <a href="">EasyShare</a>. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default Hero