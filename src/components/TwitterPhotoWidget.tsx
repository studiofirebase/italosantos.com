'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const TwitterPhotoWidget = ({ accessToken }: { accessToken: string }) => {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accessToken) {
      const fetchPhotos = async () => {
        setLoading(true);
        try {
          const res = await axios.get('https://api.twitter.com/2/users/me/media', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              'media.fields': 'url,type',
            }
          });

          const photoMedia = res.data.data.filter((item: any) => item.type === 'photo');
          setPhotos(photoMedia);
        } catch (err) {
          console.error('Error fetching Twitter photos:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchPhotos();
    }
  }, [accessToken]);

  return (
    <div>
      <h3>Twitter Photos</h3>
      {loading ? (
        <p>Loading photos...</p>
      ) : photos.length > 0 ? (
        photos.map((photo) => (
          <img key={photo.media_key} src={photo.url} alt="Twitter Photo" width={150} />
        ))
      ) : (
        <p>No photos found.</p>
      )}
    </div>
  );
};

export default TwitterPhotoWidget;
