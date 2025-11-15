import React, { useState } from 'react'

const SignupForm = () => {
    const [formData,setFormData] = useState({
        fullname:'',phonenumber:'',email:'',password:'',confirmpassword:''
    })

    function handleChange(event: React.ChangeEvent<HTMLInputElement>){
        setFormData((prevFormData)=>{
            return{
                ...prevFormData,
                [event.target.name]:event.target.value
            }
        })
    }
    return (
        <form>
            <input placeholder='Full Name' name='fullname' onChange={handleChange}/>
            <input placeholder='Phone Number' name='phonenumber' onChange={handleChange}/>
            <input placeholder='Email' name='email' onChange={handleChange}/>
            <input placeholder='Password' name='password' onChange={handleChange}/>
            <input placeholder='Confirm Password' name='confirmpassword' onChange={handleChange}/>
            <button type='submit'>Sign Up</button>
        </form>
    )
}

export default SignupForm