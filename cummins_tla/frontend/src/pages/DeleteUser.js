import Button from "react-bootstrap/Button";
import {apiWrapper} from "../apiWrapper";
import {useState} from "react";
import NavBar from "./components/NavBar";


export default function Admin(){
    const [userId, setUserId] = useState('');
    const handleDelete = async () => {
        try{
            console.log("user id ", userId);
            const input = {item: userId};
            const deleteUser = await apiWrapper('api/deleteUser', 'POST', {input});


        }catch (error) {
            console.error('Error:', error);
            ;
        }
    }

    return(
        <div>
            <div>
                <NavBar />
            </div>
            <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                id="userID"
                placeholder="Enter user ID"
            />
        </div>
    )

}