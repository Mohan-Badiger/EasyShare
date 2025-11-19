import React from 'react'
import { Link } from 'react-router-dom'

const EasyShare = () => {
    return (
        <div className='sm:min-h-screen select-none'>
            {/* NavBar */}
            <nav className="z-50 flex items-center justify-between w-full pt-6 py-4 px-6 md:px-16 lg:px-24 xl:px-40 text-sm">
                <Link to="/">
                    <p className='text-2xl sm:text-3xl font-semibold text-slate-800'>Easy<span className=' bg-linear-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent text-nowrap'>Share</span></p>
                </Link>
            </nav>

            <section>
                {/* Main Hero Content */}
                <main className="flex flex-col items-center max-md:px-2">
                    <p className="mt-10 sm:mt-18 flex items-center gap-2 border border-indigo-200 rounded-full p-1 pr-3 text-sm font-medium text-indigo-500 bg-indigo-200/20">
                        <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full">
                            NEW
                        </span>
                        <p className="flex items-center gap-1">
                            <span>Try it for free</span>
                           
                        </p>
                    </p>

                    <h1 className="text-center text-2xl leading-10 sm:leading-[58px] md:text-4xl md:leading-80px font-semibold max-w-4xl text-slate-900">
                        EasyShare: Speed & Security, Simplified.
                    </h1>
                    <p className="text-center text-base text-slate-700 max-w-lg hidden md:flex">
                        Share Files Instantly — No Cloud Storage, No Sign-ups.
                    </p>
                    <div className="flex items-center gap-4 mt-8 px-10">
                        {/* Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                            {/* Send Card */}
                            <Link to='/sender' className="card-hover p-8 lg:p-12 rounded-md shadow-xl bg-linear-to-br from-indigo-50 to-indigo-100 border border-indigo-400 flex flex-col items-center text-center text-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" height="60" width="60" viewBox="0 0 640 640"><path fill="#586adf" d="M176 544C96.5 544 32 479.5 32 400C32 336.6 73 282.8 129.9 263.5C128.6 255.8 128 248 128 240C128 160.5 192.5 96 272 96C327.4 96 375.5 127.3 399.6 173.1C413.8 164.8 430.4 160 448 160C501 160 544 203 544 256C544 271.7 540.2 286.6 533.5 299.7C577.5 320 608 364.4 608 416C608 486.7 550.7 544 480 544L176 544zM337 255C327.6 245.6 312.4 245.6 303.1 255L231.1 327C221.7 336.4 221.7 351.6 231.1 360.9C240.5 370.2 255.7 370.3 265 360.9L296 329.9L296 432C296 445.3 306.7 456 320 456C333.3 456 344 445.3 344 432L344 329.9L375 360.9C384.4 370.3 399.6 370.3 408.9 360.9C418.2 351.5 418.3 336.3 408.9 327L336.9 255z" /></svg>

                                <h3 className="text-3xl font-semibold mb-2">Send Files</h3>
                                <p className="text-base text-gray-600 font-light max-w-xs">
                                    Drop files to generate a live, temporary share code.
                                </p>
                            </Link>

                            {/* Receive Card */}
                            <Link to='/receiver' className="card-hover p-8 lg:p-12 rounded-md shadow-xl bg-linear-to-br from-teal-50 to-teal-100 border border-teal-400 flex flex-col items-center text-center text-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" height="60" width="60" viewBox="0 0 640 640"><path fill="#37d7c7" d="M176 544C96.5 544 32 479.5 32 400C32 336.6 73 282.8 129.9 263.5C128.6 255.8 128 248 128 240C128 160.5 192.5 96 272 96C327.4 96 375.5 127.3 399.6 173.1C413.8 164.8 430.4 160 448 160C501 160 544 203 544 256C544 271.7 540.2 286.6 533.5 299.7C577.5 320 608 364.4 608 416C608 486.7 550.7 544 480 544L176 544zM409 377C418.4 367.6 418.4 352.4 409 343.1C399.6 333.8 384.4 333.7 375.1 343.1L344.1 374.1L344.1 272C344.1 258.7 333.4 248 320.1 248C306.8 248 296.1 258.7 296.1 272L296.1 374.1L265.1 343.1C255.7 333.7 240.5 333.7 231.2 343.1C221.9 352.5 221.8 367.7 231.2 377L303.2 449C312.6 458.4 327.8 458.4 337.1 449L409.1 377z" /></svg>

                                <h3 className="text-3xl font-semibold mb-2">Receive Files</h3>
                                <p className="text-base text-gray-600 font-light max-w-xs">
                                    Enter a code to instantly join a private data stream.
                                </p>
                            </Link>
                        </div>
                    </div>
                </main>
            </section>
        </div>
    )
}

export default EasyShare



