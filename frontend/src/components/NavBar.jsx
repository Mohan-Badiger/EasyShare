import React from 'react'
import {Link} from 'react-router-dom'
 
const NavBar = () => {
    return (
        <>
            <nav className="z-50 flex items-center justify-between w-full pt-6 px-6 md:px-16 lg:px-24 xl:px-40 text-sm">
                <Link to="/">
                    <p className='text-2xl sm:text-3xl font-semibold text-slate-800'>Easy<span className=' bg-linear-to-r from-indigo-700 to-indigo-600 bg-clip-text text-transparent text-nowrap'>Share</span></p>
                </Link>
            </nav>
        </>
    )
}

export default NavBar